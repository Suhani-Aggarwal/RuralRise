
import json
from seller_recommendations import recommend_for_seller


# ============================================================
# RURALRISE - AI SELLER RECOMMENDATION TESTING
# ============================================================

# TEST SELLER LISTINGS
listings = [
    {
        "_id": "listing_001",
        "seller_id": "seller_A",
        "seller_name": "Green Fields Farm",
        "product_name": "Wheat",
        "category": "Agriculture",
        "quantity": 80,
        "unit": "kg",
        "price": 25,
        "state": "Punjab",
        "village": "Rampur"
    },
    {
        "_id": "listing_002",
        "seller_id": "seller_A",
        "seller_name": "Green Fields Farm",
        "product_name": "Bamboo Baskets",
        "category": "Handicrafts",
        "quantity": 200,
        "unit": "pieces",
        "price": 50,
        "state": "Punjab",
        "village": "Rampur"
    },
    {
        "_id": "listing_003",
        "seller_id": "seller_A",
        "seller_name": "Green Fields Farm",
        "product_name": "Handmade Cotton Bags",
        "category": "Handicrafts",
        "quantity": 150,
        "unit": "pieces",
        "price": 40,
        "state": "Punjab",
        "village": "Rampur"
    }
]


# TEST BULK BUYER REQUESTS
bulk_requests = [
    {
        "_id": "bulk_001",
        "product_name": "Wheat",
        "category": "Agriculture",
        "required_quantity": 100,
        "unit": "kg",
        "location": "Punjab",
        "max_price": 30,
        "status": "open",
        "deadline": "2026-11-20"
    },
    {
        "_id": "bulk_002",
        "product_name": "Handcrafted Bamboo Storage Basket",
        "category": "Handicrafts",
        "required_quantity": 100,
        "unit": "pieces",
        "location": "Punjab",
        "max_price": 60,
        "status": "open",
        "deadline": "2026-11-25"
    },
    {
        "_id": "bulk_003",
        "product_name": "Reusable Cotton Shopping Bags",
        "category": "Handicrafts",
        "required_quantity": 100,
        "unit": "pieces",
        "location": "Punjab",
        "max_price": 50,
        "status": "open",
        "deadline": "2026-11-28"
    },
    {
        "_id": "bulk_004",
        "product_name": "Wheat",
        "category": "Agriculture",
        "required_quantity": 50,
        "unit": "kg",
        "location": "Punjab",
        "max_price": 20,
        "status": "open",
        "deadline": "2026-11-20"
    },
    {
        "_id": "bulk_005",
        "product_name": "Bamboo Baskets",
        "category": "Handicrafts",
        "required_quantity": 50,
        "unit": "pieces",
        "location": "Punjab",
        "max_price": 60,
        "status": "closed",
        "deadline": "2026-11-20"
    }
]


# ============================================================
# RUN RECOMMENDATION ENGINE
# ============================================================

print("\n" + "=" * 65)
print("RURALRISE - AI SELLER RECOMMENDATION ENGINE TEST")
print("=" * 65)

result = recommend_for_seller(
    seller_id="seller_A",
    listings=listings,
    bulk_requests=bulk_requests,
    limit=10,
    use_semantic=True
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\nAI MODEL STATUS:")
print(
    "Semantic AI:",
    "ENABLED" if result["semantic_enabled"] else "DISABLED"
)

print("\nTOTAL RECOMMENDATIONS:")
print(result["total_recommendations"])

print("\n" + "=" * 65)
print("DETAILED RECOMMENDATIONS")
print("=" * 65)

for index, recommendation in enumerate(
    result["recommendations"], start=1
):
    print(f"\nRECOMMENDATION #{index}")

    print(
        "Buyer Product:",
        recommendation["product_name"]
    )

    print(
        "Seller Product:",
        recommendation["seller_product"]
    )

    print(
        "Match Type:",
        recommendation["match_type"].upper()
    )

    print(
        "Match Score:",
        recommendation["match_score"],
        "/ 100"
    )

    print(
        "Semantic Similarity:",
        recommendation["semantic_similarity"]
    )

    print(
        "Buyer Required Quantity:",
        recommendation["required_quantity"]
    )

    print(
        "Seller Available Quantity:",
        recommendation["available_quantity"]
    )

    print(
        "Potential Contribution:",
        recommendation["potential_contribution"]
    )

    print(
        "Coverage:",
        recommendation["coverage_percentage"],
        "%"
    )

    print(
        "Requires Product Confirmation:",
        recommendation["requires_product_confirmation"]
    )

    print("Reasons:")
    for reason in recommendation["reasons"]:
        print("  -", reason)

    print("-" * 65)


# ============================================================
# TEST VALIDATION
# ============================================================

recommended_ids = {
    item["bulk_request_id"]
    for item in result["recommendations"]
}

by_id = {
    item["bulk_request_id"]: item
    for item in result["recommendations"]
}

print("\n" + "=" * 65)
print("TEST VALIDATION")
print("=" * 65)


def check_test(name, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}")
    return bool(condition)


tests = []

tests.append(check_test(
    "Exact Wheat recommendation",
    "bulk_001" in recommended_ids
    and by_id["bulk_001"]["match_type"] == "exact"
))

tests.append(check_test(
    "Wheat quantity coverage is 80%",
    "bulk_001" in recommended_ids
    and by_id["bulk_001"]["coverage_percentage"] == 80
))

tests.append(check_test(
    "Bamboo semantic recommendation",
    "bulk_002" in recommended_ids
    and by_id["bulk_002"]["match_type"] == "semantic"
    and by_id["bulk_002"]["requires_product_confirmation"]
))

tests.append(check_test(
    "Cotton Bags semantic recommendation",
    "bulk_003" in recommended_ids
    and by_id["bulk_003"]["match_type"] == "semantic"
    and by_id["bulk_003"]["requires_product_confirmation"]
))

tests.append(check_test(
    "Over-budget request is excluded",
    "bulk_004" not in recommended_ids
))

tests.append(check_test(
    "Closed request is excluded",
    "bulk_005" not in recommended_ids
))

tests.append(check_test(
    "Semantic AI model loaded",
    result["semantic_enabled"] is True
))

print("\n" + "=" * 65)

passed = sum(tests)
total = len(tests)

print(f"TESTS PASSED: {passed}/{total}")

if passed == total:
    print("ALL TESTS PASSED!")
else:
    print("Some tests failed. Review the results above.")

print("=" * 65)


# ============================================================
# FULL JSON OUTPUT
# ============================================================

print("\nFULL JSON RESPONSE:\n")

print(json.dumps(result, indent=2))
