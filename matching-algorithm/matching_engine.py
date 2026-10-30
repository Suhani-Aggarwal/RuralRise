
import re
from decimal import Decimal

def normalize_product(name):
    name = re.sub(r"\s+", " ", name.strip().lower())
    if name.endswith("bags"):
        name = name[:-1]
    return name

def match_products(request, listings):
    required = request["quantity"]

    if required <= 0:
        raise ValueError("Quantity must be positive")

    product = normalize_product(request["product"])
    unit = request["unit"].strip().lower()
    max_price = request.get("max_price")

    eligible = []

    for listing in listings:
        if normalize_product(listing["product_name"]) != product:
            continue

        if listing["unit"].strip().lower() != unit:
            continue

        if listing["quantity"] <= 0 or listing["price"] < 0:
            continue

        if max_price is not None and listing["price"] > max_price:
            continue

        eligible.append(listing)

    eligible.sort(key=lambda item: item["price"])

    remaining = required
    matches = []
    total_cost = Decimal("0")

    for seller in eligible:
        if remaining <= 0:
            break

        allocated = min(seller["quantity"], remaining)
        price = Decimal(str(seller["price"]))

        matches.append({
            "seller_id": seller["seller_id"],
            "seller_name": seller["seller_name"],
            "allocated_quantity": allocated,
            "unit_price": str(price),
            "subtotal": str(price * Decimal(str(allocated)))
        })

        total_cost += price * Decimal(str(allocated))
        remaining -= allocated

    return {
        "product": request["product"],
        "requested_quantity": required,
        "matched_quantity": required - remaining,
        "remaining_quantity": remaining,
        "is_fulfilled": remaining == 0,
        "total_cost": str(total_cost),
        "matches": matches
    }


# Sample MSME listings
listings = [
    {
        "seller_id": "S001",
        "seller_name": "MSME A",
        "product_name": "Cotton Bags",
        "quantity": 400,
        "unit": "pieces",
        "price": 40
    },
    {
        "seller_id": "S002",
        "seller_name": "MSME B",
        "product_name": "Cotton Bag",
        "quantity": 350,
        "unit": "pieces",
        "price": 45
    },
    {
        "seller_id": "S003",
        "seller_name": "MSME C",
        "product_name": "Cotton Bags",
        "quantity": 500,
        "unit": "pieces",
        "price": 50
    }
]

buyer_request = {
    "product": "Cotton Bags",
    "quantity": 1000,
    "unit": "pieces",
    "max_price": 60
}

result = match_products(buyer_request, listings)

from pprint import pprint
pprint(result)
