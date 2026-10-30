
import re
from decimal import Decimal, InvalidOperation


# ============================================================
# RURALRISE - BULK PRODUCT MATCHING ENGINE
# ============================================================
#
# Matching strategy:
# 1. Normalize product names and units.
# 2. Filter incompatible or unavailable listings.
# 3. Apply the buyer's maximum price constraint.
# 4. Prioritize the cheapest eligible listings.
# 5. Use preferred location to break price ties.
# 6. Combine quantities from multiple MSME listings.
# 7. Return a matching proposal.
#
# IMPORTANT:
# This algorithm does not reserve or deduct inventory.
# ============================================================


# ------------------------------------------------------------
# 1. PRODUCT NORMALIZATION
# ------------------------------------------------------------

PRODUCT_ALIASES = {
    "hand woven": "handwoven",
    "hand made": "handmade",
    "eco friendly": "ecofriendly",
    "eco-friendly": "ecofriendly",
}

# Explicit singular/plural mappings for common products.
# This avoids blindly removing "s" from every word.
PRODUCT_PLURALS = {
    "bags": "bag",
    "baskets": "basket",
    "bottles": "bottle",
    "candles": "candle",
    "pickles": "pickle",
    "jars": "jar",
    "boxes": "box",
    "tomatoes": "tomato",
    "potatoes": "potato",
    "onions": "onion",
    "apples": "apple",
    "bananas": "banana",
    "mangoes": "mango",
    "carrots": "carrot",
    "shirts": "shirt",
    "scarves": "scarf",
    "soaps": "soap",
    "plates": "plate",
    "cups": "cup",
    "mats": "mat",
    "chairs": "chair",
    "tables": "table",
}


def normalize_product(name):
    """
    Normalize product names without broad fuzzy matching.

    Examples:
        Cotton Bags -> cotton bag
        cotton bag  -> cotton bag
        Bamboo Baskets -> bamboo basket
        Organic Tomatoes -> organic tomato
    """

    if not isinstance(name, str):
        return ""

    name = name.strip().lower()

    name = re.sub(r"[-_/]+", " ", name)
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()

    for original, replacement in PRODUCT_ALIASES.items():
        name = name.replace(original, replacement)

    words = name.split()

    normalized_words = [
        PRODUCT_PLURALS.get(word, word)
        for word in words
    ]

    return " ".join(normalized_words)


# ------------------------------------------------------------
# 2. UNIT NORMALIZATION
# ------------------------------------------------------------

UNIT_ALIASES = {
    "piece": "pieces",
    "pieces": "pieces",
    "pc": "pieces",
    "pcs": "pieces",

    "kg": "kg",
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",

    "g": "g",
    "gram": "g",
    "grams": "g",

    "quintal": "quintals",
    "quintals": "quintals",

    "tonne": "tonnes",
    "tonnes": "tonnes",
    "metric ton": "tonnes",
    "metric tons": "tonnes",

    "litre": "litres",
    "litres": "litres",
    "liter": "litres",
    "liters": "litres",
    "l": "litres",

    "box": "boxes",
    "boxes": "boxes",

    "jar": "jars",
    "jars": "jars",

    "pack": "packs",
    "packs": "packs",
}


def normalize_unit(unit):
    """Normalize alternative names for the same unit."""

    if not isinstance(unit, str):
        return ""

    unit = re.sub(r"\s+", " ", unit.strip().lower())

    return UNIT_ALIASES.get(unit, unit)


# ------------------------------------------------------------
# 3. LOCATION NORMALIZATION
# ------------------------------------------------------------

def normalize_location(location):
    """
    Normalize location text for basic comparison.

    Examples:
        Jaipur, Rajasthan -> ["jaipur", "rajasthan"]
        Rajasthan -> ["rajasthan"]
    """

    if not isinstance(location, str):
        return set()

    location = location.lower().strip()

    location = re.sub(
        r"\b(india|bharat)\b",
        "",
        location
    )

    parts = re.split(r"[,;/]+", location)

    return {
        re.sub(r"\s+", " ", part).strip()
        for part in parts
        if part.strip()
    }


def is_preferred_location(
    buyer_location,
    seller_state,
    seller_village
):
    """
    Determine whether the seller matches a buyer's
    stated location preference.

    This is not a distance calculation.
    """

    buyer_parts = normalize_location(buyer_location)

    if not buyer_parts:
        return False

    seller_parts = (
        normalize_location(seller_state)
        | normalize_location(seller_village)
    )

    return bool(buyer_parts & seller_parts)


# ------------------------------------------------------------
# 4. SAFE DECIMAL CONVERSION
# ------------------------------------------------------------

def to_decimal(value):
    """
    Convert numeric values safely.

    Returns None for invalid or non-finite values.
    """

    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None

    if not number.is_finite():
        return None

    return number


# ------------------------------------------------------------
# 5. MATCHING ALGORITHM
# ------------------------------------------------------------

def match_products(request, listings):
    """
    Match a buyer's bulk requirement against available
    MSME product listings.

    Uses a cheapest-first allocation strategy.

    Location is a preference, not a mandatory filter.

    Returns a proposal only. Inventory is not modified.
    """

    # --------------------------------------------------------
    # STEP 1: READ BUYER REQUIREMENT
    # --------------------------------------------------------

    product_name = request.get("product_name", "")
    required_quantity = to_decimal(
        request.get("required_quantity")
    )

    unit = request.get("unit", "")
    location = request.get("location")
    max_price = request.get("max_price")

    normalized_product = normalize_product(product_name)
    normalized_unit = normalize_unit(unit)

    if not normalized_product:
        raise ValueError("Product name is required")

    if not normalized_unit:
        raise ValueError("Unit is required")

    if required_quantity is None or required_quantity <= 0:
        raise ValueError(
            "Required quantity must be a positive number"
        )

    # Prevent fractional quantities for countable units.
    countable_units = {
        "pieces",
        "boxes",
        "jars",
        "packs",
    }

    if (
        normalized_unit in countable_units
        and required_quantity != required_quantity.to_integral_value()
    ):
        raise ValueError(
            "Quantity must be a whole number for this unit"
        )

    maximum_price = None

    if max_price is not None:
        maximum_price = to_decimal(max_price)

        if maximum_price is None or maximum_price < 0:
            raise ValueError(
                "Maximum price must be a valid non-negative number"
            )

    # --------------------------------------------------------
    # STEP 2: FILTER ELIGIBLE LISTINGS
    # --------------------------------------------------------

    eligible = []

    for listing in listings:

        listing_product = normalize_product(
            listing.get("product_name", "")
        )

        if listing_product != normalized_product:
            continue

        listing_unit = normalize_unit(
            listing.get("unit", "")
        )

        if listing_unit != normalized_unit:
            continue

        available = to_decimal(
            listing.get("quantity")
        )

        price = to_decimal(
            listing.get("price")
        )

        if available is None or available <= 0:
            continue

        if price is None or price < 0:
            continue

        if (
            normalized_unit in countable_units
            and available != available.to_integral_value()
        ):
            continue

        if (
            maximum_price is not None
            and price > maximum_price
        ):
            continue

        # A listing must have an ID and seller details.
        listing_id = listing.get("_id")
        seller_id = listing.get("seller_id")

        if listing_id is None or not seller_id:
            continue

        preferred_location = is_preferred_location(
            location,
            listing.get("state", ""),
            listing.get("village", "")
        )

        eligible.append({
            "listing": listing,
            "available": available,
            "price": price,
            "preferred_location": preferred_location,
        })

    # --------------------------------------------------------
    # STEP 3: SORT ELIGIBLE LISTINGS
    # --------------------------------------------------------

    # Cheapest product price first.
    # Preferred location breaks equal-price ties.
    # Listing ID ensures deterministic ordering.

    eligible.sort(
        key=lambda item: (
            item["price"],
            not item["preferred_location"],
            str(item["listing"].get("_id", ""))
        )
    )

    # --------------------------------------------------------
    # STEP 4: ALLOCATE REQUIRED QUANTITY
    # --------------------------------------------------------

    remaining = required_quantity

    matches = []

    total_cost = Decimal("0")

    unique_sellers = set()

    for item in eligible:

        if remaining <= 0:
            break

        listing = item["listing"]

        available = item["available"]
        price = item["price"]

        allocated = min(available, remaining)

        if allocated <= 0:
            continue

        subtotal = allocated * price

        seller_id = str(listing["seller_id"])

        unique_sellers.add(seller_id)

        matches.append({
            "listing_id": str(listing["_id"]),
            "seller_id": seller_id,
            "seller_name": listing.get(
                "seller_name",
                "Unknown Seller"
            ),

            # Quantity assigned to this buyer
            "allocated_quantity": float(allocated),

            # Total stock before allocation
            "available_quantity": float(available),

            "unit": normalized_unit,

            "unit_price": float(price),

            # Retained for compatibility with older UI code
            "price": float(price),

            "subtotal": float(subtotal),

            "state": listing.get("state", ""),
            "village": listing.get("village", ""),

            "preferred_location": item[
                "preferred_location"
            ],
        })

        total_cost += subtotal

        remaining -= allocated

    # --------------------------------------------------------
    # STEP 5: CALCULATE FINAL RESULTS
    # --------------------------------------------------------

    matched_quantity = required_quantity - remaining

    fulfillment_percentage = (
        matched_quantity / required_quantity
    ) * Decimal("100")

    is_fulfilled = remaining <= 0

    # --------------------------------------------------------
    # STEP 6: RETURN MATCHING PROPOSAL
    # --------------------------------------------------------

    return {
        "product_name": product_name,

        "required_quantity": float(required_quantity),

        "matched_quantity": float(matched_quantity),

        "remaining_quantity": float(
            max(Decimal("0"), remaining)
        ),

        "unit": normalized_unit,

        "is_fulfilled": is_fulfilled,

        "fulfillment_percentage": round(
            float(fulfillment_percentage),
            2
        ),

        "total_cost": float(total_cost),

        "total_sellers": len(unique_sellers),

        "total_listings": len(matches),

        "matches": matches,
    }
