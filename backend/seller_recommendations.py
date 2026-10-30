
import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

from matching_engine import normalize_product, normalize_unit


MODEL_NAME = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)

_semantic_model = None
_model_attempted = False


def load_semantic_model():
    """Load the embedding model once, on demand."""
    global _semantic_model, _model_attempted

    if _model_attempted:
        return _semantic_model

    _model_attempted = True

    try:
        from sentence_transformers import SentenceTransformer

        _semantic_model = SentenceTransformer(MODEL_NAME)
        print("Seller recommendation AI model loaded.")

    except Exception as error:
        print("Semantic model unavailable:", repr(error))
        _semantic_model = None

    return _semantic_model


def clean_text(value):
    if not isinstance(value, str):
        return ""

    return re.sub(r"\s+", " ", value.strip().lower())


def number(value):
    try:
        result = Decimal(str(value))
        return result if result.is_finite() else None
    except (InvalidOperation, TypeError, ValueError):
        return None


def location_parts(value):
    text = clean_text(value)

    text = re.sub(r"\b(india|bharat)\b", "", text)

    return {
        part.strip()
        for part in re.split(r"[,;/]+", text)
        if part.strip()
    }


def location_matches(request_location, listing):
    buyer_parts = location_parts(request_location)

    seller_parts = (
        location_parts(listing.get("state"))
        | location_parts(listing.get("village"))
    )

    return bool(buyer_parts and buyer_parts & seller_parts)


def valid_deadline(value):
    if not value:
        return True

    try:
        if isinstance(value, datetime):
            deadline = value.date()
        elif isinstance(value, date):
            deadline = value
        else:
            deadline = date.fromisoformat(str(value)[:10])

        return deadline >= datetime.now(timezone.utc).date()

    except (ValueError, TypeError):
        return False


def semantic_similarity(text_a, text_b, model):
    """
    Cosine similarity from normalized embeddings.
    Returns a value between 0 and 1.
    """
    embeddings = model.encode(
        [text_a, text_b],
        normalize_embeddings=True
    )

    similarity = float(embeddings[0] @ embeddings[1])

    return max(0.0, min(1.0, similarity))


def recommend_for_seller(
    seller_id,
    listings,
    bulk_requests,
    limit=10,
    use_semantic=True
):
    """
    Recommend open bulk-buying opportunities to a seller.

    Rules:
    - Only the seller's listings are considered.
    - Products must have positive stock.
    - Units must be compatible.
    - Exact product matches are preferred.
    - Semantic matches must pass a similarity threshold.
    - Results are proposals, not confirmed orders.

    No database writes or stock deductions occur here.
    """

    seller_listings = [
        listing
        for listing in listings
        if str(listing.get("seller_id")) == str(seller_id)
        and (number(listing.get("quantity")) or 0) > 0
    ]

    if not seller_listings:
        return {
            "seller_id": seller_id,
            "total_recommendations": 0,
            "semantic_enabled": False,
            "recommendations": []
        }

    model = (
        load_semantic_model()
        if use_semantic
        else None
    )

    recommendations = []

    for request in bulk_requests:

        if clean_text(request.get("status")) != "open":
            continue

        if not valid_deadline(request.get("deadline")):
            continue

        required = number(
            request.get("required_quantity")
        )

        if required is None or required <= 0:
            continue

        request_product = normalize_product(
            request.get("product_name", "")
        )

        request_unit = normalize_unit(
            request.get("unit", "")
        )

        if not request_product or not request_unit:
            continue

        max_price = request.get("max_price")
        budget = (
            number(max_price)
            if max_price is not None
            else None
        )

        if max_price is not None and (
            budget is None or budget < 0
        ):
            continue

        best_match = None

        for listing in seller_listings:

            listing_product = normalize_product(
                listing.get("product_name", "")
            )

            listing_unit = normalize_unit(
                listing.get("unit", "")
            )

            # Hard constraint: do not mix different units.
            if listing_unit != request_unit:
                continue

            available = number(listing.get("quantity"))
            price = number(listing.get("price"))

            if (
                available is None
                or available <= 0
                or price is None
                or price < 0
            ):
                continue

            # Hard constraint: buyer's maximum unit price.
            if budget is not None and price > budget:
                continue

            exact_product = (
                listing_product == request_product
            )

            semantic_score = 0.0

            if exact_product:
                product_score = 1.0

            elif model is not None:
                # Compare product names, not descriptions.
                # This reduces misleading similarity from
                # generic marketing language.
                semantic_score = semantic_similarity(
                    listing_product,
                    request_product,
                    model
                )

                # Conservative threshold for an MVP.
                if semantic_score < 0.78:
                    continue

                product_score = semantic_score

            else:
                # No semantic model: exact matches only.
                continue

            request_category = clean_text(
                request.get("category")
            )

            listing_category = clean_text(
                listing.get("category")
            )

            category_match = bool(
                request_category
                and listing_category
                and request_category == listing_category
            )

            nearby = location_matches(
                request.get("location"),
                listing
            )

            contribution = min(available, required)

            coverage = float(contribution / required)

            # Scoring weights:
            # Product relevance: 65%
            # Quantity coverage: 20%
            # Category agreement: 10%
            # Location preference: 5%

            score = (
                product_score * 65
                + coverage * 20
                + (10 if category_match else 0)
                + (5 if nearby else 0)
            )

            reasons = []

            if exact_product:
                reasons.append("Exact product match")
            else:
                reasons.append(
                    "Semantically similar product"
                )

            if coverage >= 1:
                reasons.append(
                    "Enough stock to cover the request"
                )
            else:
                reasons.append(
                    "Can contribute to a bulk order"
                )

            if category_match:
                reasons.append("Matching category")

            if nearby:
                reasons.append(
                    "Matches preferred location"
                )

            candidate = {
                "bulk_request_id": str(request["_id"]),
                "listing_id": str(listing["_id"]),
                "seller_id": str(seller_id),

                "product_name": request["product_name"],
                "seller_product": listing["product_name"],

                "category": request.get("category", ""),
                "buyer_name": request.get("buyer_name", ""),

                "required_quantity": float(required),
                "available_quantity": float(available),
                "potential_contribution": float(contribution),

                "unit": request_unit,
                "unit_price": float(price),
                "max_price": (
                    float(budget)
                    if budget is not None
                    else None
                ),

                "location": request.get("location", ""),
                "deadline": (
                    str(request.get("deadline"))
                    if request.get("deadline")
                    else None
                ),

                "coverage_percentage": round(
                    coverage * 100, 2
                ),

                "match_score": round(score, 2),

                "match_type": (
                    "exact"
                    if exact_product
                    else "semantic"
                ),

                "semantic_similarity": round(
                    semantic_score, 3
                ),

                "reasons": reasons,

                "requires_product_confirmation": (
                    not exact_product
                )
            }

            if (
                best_match is None
                or candidate["match_score"]
                > best_match["match_score"]
            ):
                best_match = candidate

        # Return only the best listing per bulk request.
        if best_match is not None:
            recommendations.append(best_match)

    recommendations.sort(
        key=lambda item: (
            -item["match_score"],
            -item["coverage_percentage"],
            item["bulk_request_id"]
        )
    )

    recommendations = recommendations[:limit]

    return {
        "seller_id": str(seller_id),
        "total_recommendations": len(recommendations),
        "semantic_enabled": model is not None,
        "recommendations": recommendations
    }
