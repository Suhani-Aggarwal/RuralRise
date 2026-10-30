import os
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from typing import Optional, Literal
from typing import Literal
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Header, HTTPException, Depends

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

def verify_firebase_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is missing"
        )

    try:
        scheme, token = authorization.split(" ", 1)

        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )

        decoded_token = auth.verify_id_token(token)
        return decoded_token

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token"
        )

@app.get("/requests/seller/me")
def get_seller_requests(
    user: dict = Depends(verify_firebase_token)
):
    seller_requests = list(
        requests_collection.find({
            "seller_id": user["uid"]
        })
    )

    for request in seller_requests:
        request["_id"] = str(request["_id"])

    return seller_requests

    
@app.post("/requests/")
def create_request(
    request: BuyerRequest,
    user: dict = Depends(verify_firebase_token)
):
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
        "buyer_id": user["uid"],
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


@app.patch("/requests/{request_id}")
def update_request_status(
    request_id: str,
    update: RequestStatusUpdate,
    user: dict = Depends(verify_firebase_token)
):
    # Validate request ID
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")

    # Validate requested status
    if update.status not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be accepted or rejected"
        )

    # Find the buyer request
    buyer_request = requests_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if buyer_request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    # Find the listing associated with this request
    listing = listings_collection.find_one({
        "_id": ObjectId(buyer_request["listing_id"])
    })

    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Only the seller who owns this listing can update the request
    if listing["seller_id"] != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update this request"
        )

    # Only pending requests can be updated
    if buyer_request["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail="This request has already been processed"
        )

    # If seller rejects, do not change stock
    if update.status == "rejected":
        result = requests_collection.update_one(
            {
                "_id": ObjectId(request_id),
                "status": "pending"
            },
            {
                "$set": {"status": "rejected"}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=409,
                detail="Request could not be updated"
            )

        return {
            "message": "Request rejected successfully",
            "stock_deducted": False
        }

    # If seller accepts, deduct stock safely
    result = listings_collection.update_one(
        {
            "_id": ObjectId(buyer_request["listing_id"]),
            "seller_id": user["uid"],
            "quantity": {"$gte": buyer_request["required_quantity"]}
        },
        {
            "$inc": {
                "quantity": -buyer_request["required_quantity"]
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Insufficient stock or listing not found"
        )

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

        raise HTTPException(
            status_code=409,
            detail="Request could not be updated"
        )

    return {
        "message": "Request accepted successfully!",
        "stock_deducted": True,
        "quantity_deducted": buyer_request["required_quantity"],
        "unit": buyer_request["unit"]
    }

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


@app.post("/listings/")
def create_listing(
    listing: Listing,
    user: dict = Depends(verify_firebase_token)
):
    listing_data = listing.model_dump()

    # Always use the authenticated seller's Firebase UID
    listing_data["seller_id"] = user["uid"]

    result = listings_collection.insert_one(listing_data)

    return {
        "message": "Product listed successfully!",
        "listing_id": str(result.inserted_id),
        "seller_id": user["uid"]
    }


@app.get("/requests/buyer/me")
def get_buyer_requests(
    user: dict = Depends(verify_firebase_token)
):
    buyer_requests = list(
        requests_collection.find({
            "buyer_id": user["uid"]
        })
    )

    for request in buyer_requests:
        request["_id"] = str(request["_id"])

    return buyer_requests


FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

@app.get("/auth/me")
def get_current_user(
    user: dict = Depends(verify_firebase_token)
):
    return {
        "message": "Authentication successful!",
        "uid": user["uid"],
        "email": user.get("email")
    }

