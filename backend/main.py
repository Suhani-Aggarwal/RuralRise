import os
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from typing import Optional, Literal
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Header, HTTPException

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
sellers_collection = db["sellers"]
listings_collection = db["listings"]
requests_collection = db["requests"]

app = FastAPI(
    title="RuralRise API",
    description="Backend API for the RuralRise marketplace",
    version="1.0.0"
)
class Seller(BaseModel):
    name: str
    phone: str
    village: str
    products: list[str]

class Listing(BaseModel):
    category: str
    seller_id: str
    product_name: str
    seller_name: str
    state: str
    village: str
    quantity: float
    unit: str
    price: float
    description: str = ""
    image_url: str = ""

class MatchingRequest(BaseModel):
    product_name: str
    required_quantity: float
    unit: str
    location: Optional[str] = None

class BuyerRequest(BaseModel):
    listing_id: str
    required_quantity: float
    unit: str
    message: str = ""

class RequestStatusUpdate(BaseModel):
    status: str

@app.get("/")
def home():
    return {
        "message": "Welcome to RuralRise API!",
        "status": "Running successfully"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.get("/db-health")
def database_health():
    try:
        client.admin.command("ping")
        return {
            "status": "connected",
            "database": DB_NAME
        }
    except Exception as e:
        print("Database connection error:", e)
        return {"status": "error", "message": "Database connection failed"}
@app.post("/sellers/")
def create_seller(seller: Seller):
    seller_data = seller.model_dump()
    result = sellers_collection.insert_one(seller_data)

    return {
        "message": "Seller registered successfully!",
        "seller_id": str(result.inserted_id)
    }

@app.get("/sellers/")
def get_sellers():
    sellers = list(sellers_collection.find())

    for seller in sellers:
        seller["_id"] = str(seller["_id"])

    return sellers

@app.post("/listings/")
def create_listing(listing: Listing):
    listing_data = listing.model_dump()

    result = listings_collection.insert_one(listing_data)

    return {
        "message": "Product listed successfully!",
        "listing_id": str(result.inserted_id)
    }

@app.get("/listings/")
def get_listings(category: str = None):
    query = {}

    if category:
        query["category"] = category

    listings = list(listings_collection.find(query))

    for listing in listings:
        listing["_id"] = str(listing["_id"])

    return listings

@app.post("/matching/")
def match_sellers(request: MatchingRequest):

    # Find listings for the requested product and unit
    query = {
        "product_name": {
            "$regex": f"^{request.product_name}$",
            "$options": "i"
        },
        "unit": {
            "$regex": f"^{request.unit}$",
            "$options": "i"
        }
    }

    listings = list(
        listings_collection.find(query).sort("price", 1)
    )

    remaining_quantity = request.required_quantity
    matched_quantity = 0
    matches = []

    for listing in listings:
        if remaining_quantity <= 0:
            break

        available = listing.get("quantity", 0)

        if available <= 0:
            continue

        quantity_to_take = min(available, remaining_quantity)

        matches.append({
            "listing_id": str(listing["_id"]),
            "seller_id": listing["seller_id"],
            "seller_name": listing["seller_name"],
            "available_quantity": quantity_to_take,
            "unit": listing["unit"],
            "price": listing["price"],
            "state": listing["state"],
            "village": listing["village"]
        })

        matched_quantity += quantity_to_take
        remaining_quantity -= quantity_to_take

    return {
        "product_name": request.product_name,
        "required_quantity": request.required_quantity,
        "matched_quantity": matched_quantity,
        "unit": request.unit,
        "is_fulfilled": matched_quantity >= request.required_quantity,
        "matches": matches
    }

@app.delete("/listings/{listing_id}")
def delete_listing(listing_id: str):

    if not ObjectId.is_valid(listing_id):
        return {"error": "Invalid listing ID"}

    result = listings_collection.delete_one({
        "_id": ObjectId(listing_id)
    })

    if result.deleted_count == 0:
        return {"error": "Listing not found"}

    return {
        "message": "Listing deleted successfully!",
        "listing_id": listing_id
    }

@app.post("/requests/")
def create_request(request: BuyerRequest):

    # Check whether the listing exists
    if not ObjectId.is_valid(request.listing_id):
        return {"error": "Invalid listing ID"}

    listing = listings_collection.find_one({
        "_id": ObjectId(request.listing_id)
    })

    if listing is None:
        return {"error": "Listing not found"}

    # Validate requested quantity
    if request.required_quantity <= 0:
        return {"error": "Quantity must be greater than zero"}

    if request.unit.lower() != listing["unit"].lower():
        return {"error": "Unit does not match the listing"}

    if request.required_quantity > listing["quantity"]:
        return {"error": "Requested quantity exceeds available stock"}

    # Create pending request
    request_data = {
        "listing_id": request.listing_id,
        "seller_id": listing["seller_id"],
        "seller_name": listing["seller_name"],
        "product_name": listing["product_name"],
        "buyer_id": "demo_buyer",
        "required_quantity": request.required_quantity,
        "unit": request.unit,
        "message": request.message,
        "status": "pending"
    }

    result = requests_collection.insert_one(request_data)

    return {
        "message": "Request sent successfully!",
        "request_id": str(result.inserted_id),
        "status": "pending"
    }

@app.get("/requests/seller/{seller_id}")
def get_seller_requests(seller_id: str):

    requests = list(
        requests_collection.find({
            "seller_id": seller_id
        })
    )

    for request in requests:
        request["_id"] = str(request["_id"])

    return requests

@app.patch("/requests/{request_id}")
def update_request_status(
    request_id: str,
    update: RequestStatusUpdate
):

    # Validate request ID
    if not ObjectId.is_valid(request_id):
        return {"error": "Invalid request ID"}

    # Check requested status
    if update.status not in ["accepted", "rejected"]:
        return {"error": "Status must be accepted or rejected"}

    # Find the buyer request
    buyer_request = requests_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if buyer_request is None:
        return {"error": "Request not found"}

    # Only pending requests can be updated
    if buyer_request["status"] != "pending":
        return {"error": "This request has already been processed"}

    # If seller rejects, do not change stock
    if update.status == "rejected":

        requests_collection.update_one(
            {
                "_id": ObjectId(request_id),
                "status": "pending"
            },
            {
                "$set": {"status": "rejected"}
            }
        )

        return {
            "message": "Request rejected successfully",
            "stock_deducted": False
        }

    # If seller accepts, deduct stock safely
    result = listings_collection.update_one(
        {
            "_id": ObjectId(buyer_request["listing_id"]),
            "quantity": {"$gte": buyer_request["required_quantity"]}
        },
        {
            "$inc": {
                "quantity": -buyer_request["required_quantity"]
            }
        }
    )

    if result.modified_count == 0:
        return {"error": "Insufficient stock or listing not found"}

    # Update request status
    status_result = requests_collection.update_one(
        {
            "_id": ObjectId(request_id),
            "status": "pending"
        },
        {
            "$set": {"status": "accepted"}
        }
    )

    if status_result.modified_count == 0:
        # Restore stock if request status could not be updated
        listings_collection.update_one(
            {"_id": ObjectId(buyer_request["listing_id"])},
            {
                "$inc": {
                    "quantity": buyer_request["required_quantity"]
                }
            }
        )

        return {"error": "Request could not be updated"}

    return {
        "message": "Request accepted successfully!",
        "stock_deducted": True,
        "quantity_deducted": buyer_request["required_quantity"],
        "unit": buyer_request["unit"]
    }
category: Literal[
    "Agriculture",
    "Fruits & Vegetables",
    "Grains & Pulses",
    "Dairy Products",
    "Livestock & Poultry",
    "Handicrafts",
    "Handloom & Textiles",
    "Food & Beverages",
    "Spices & Herbs",
    "Organic Products",
    "Flowers & Plants",
    "Forest Products",
    "Household Products",
    "Rural Services",
    "Other"
]

@app.get("/listings/{listing_id}")
def get_listing(listing_id: str):

    if not ObjectId.is_valid(listing_id):
        return {"error": "Invalid listing ID"}

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id)
    })

    if listing is None:
        return {"error": "Listing not found"}

    listing["_id"] = str(listing["_id"])

    return listing

@app.get("/listings/{listing_id}")
def get_listing(listing_id: str):

    if not ObjectId.is_valid(listing_id):
        return {"error": "Invalid listing ID"}

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id)
    })

    if listing is None:
        return {"error": "Listing not found"}

    listing["_id"] = str(listing["_id"])

    return listing

@app.get("/requests/seller/{seller_id}")
def get_seller_requests(seller_id: str):
    seller_requests = list(
        requests_collection.find({
            "seller_id": seller_id
        })
    )

    for request in seller_requests:
        request["_id"] = str(request["_id"])

    return seller_requests

@app.get("/requests/buyer/{buyer_id}")
def get_buyer_requests(buyer_id: str):
    buyer_requests = list(
        requests_collection.find({
            "buyer_id": buyer_id
        })
    )

    for request in buyer_requests:
        request["_id"] = str(request["_id"])

    return buyer_requests

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)