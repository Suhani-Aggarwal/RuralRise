import os
from pathlib import Path
from datetime import date, datetime, timezone
from typing import Optional, Literal

import firebase_admin
from firebase_admin import credentials, auth

from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    Query
)
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field

from matching_engine import match_products
from seller_recommendations import recommend_for_seller


# ============================================================
# 1. ENVIRONMENT CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env", override=True)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")

FIREBASE_CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS_PATH"
)

if not MONGODB_URI:
    raise RuntimeError(
        "MONGODB_URI is missing from .env"
    )

if not DB_NAME:
    raise RuntimeError(
        "DB_NAME is missing from .env"
    )

if not FIREBASE_CREDENTIALS_PATH:
    raise RuntimeError(
        "FIREBASE_CREDENTIALS_PATH is missing from .env"
    )


# ============================================================
# 2. MONGODB CONNECTION
# ============================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=10000
)

db = client[DB_NAME]

sellers_collection = db["sellers"]
listings_collection = db["listings"]
requests_collection = db["requests"]

# Separate collection for bulk buyer opportunities
bulk_requests_collection = db["bulk_requests"]


# ============================================================
# 3. MONGODB INDEXES
# ============================================================

# Indexes improve query performance.
# MongoDB reuses existing indexes with the same specification.

bulk_requests_collection.create_index(
    [("status", 1), ("deadline", 1)]
)

listings_collection.create_index(
    [("seller_id", 1), ("quantity", 1)]
)


# ============================================================
# 4. FIREBASE ADMIN INITIALIZATION
# ============================================================

firebase_key_path = (
    BASE_DIR / FIREBASE_CREDENTIALS_PATH
)

if not firebase_key_path.is_file():
    raise FileNotFoundError(
        f"Firebase credentials file not found: "
        f"{firebase_key_path}"
    )

if not firebase_admin._apps:
    firebase_cred = credentials.Certificate(
        str(firebase_key_path)
    )

    firebase_admin.initialize_app(
        firebase_cred
    )


# ============================================================
# 5. FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="RuralRise API",
    description=(
        "Backend API for the RuralRise marketplace, "
        "bulk matching and AI recommendations"
    ),
    version="1.0.0"
)


# ============================================================
# 6. CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# 7. FIREBASE AUTHENTICATION
# ============================================================

# This registers HTTP Bearer authentication in Swagger.
# Swagger will now display the Authorize button.

firebase_bearer = HTTPBearer(
    auto_error=False
)


def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(
        firebase_bearer
    )
):
    """
    Verify the Firebase ID token sent by the client.

    Expected header:
        Authorization: Bearer <firebase_id_token>
    """

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is missing"
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication scheme"
        )

    try:
        decoded_token = auth.verify_id_token(
            credentials.credentials
        )

        return decoded_token

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token"
        )


# ============================================================
# 8. PYDANTIC MODELS
# ============================================================

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
    product_name: str = Field(
        min_length=1
    )

    required_quantity: float = Field(
        gt=0,
        allow_inf_nan=False
    )

    unit: str = Field(
        min_length=1
    )

    location: Optional[str] = None

    max_price: Optional[float] = Field(
        default=None,
        ge=0,
        allow_inf_nan=False
    )


class BuyerRequest(BaseModel):
    listing_id: str
    required_quantity: float
    unit: str
    message: str = ""


class RequestStatusUpdate(BaseModel):
    status: str


class BulkOpportunityCreate(BaseModel):
    product_name: str = Field(
        min_length=1
    )

    category: str = ""

    required_quantity: float = Field(
        gt=0,
        allow_inf_nan=False
    )

    unit: str = Field(
        min_length=1
    )

    location: str = ""

    deadline: Optional[date] = None

    description: str = ""

    max_price: Optional[float] = Field(
        default=None,
        ge=0,
        allow_inf_nan=False
    )


# ============================================================
# 9. HOME AND HEALTH ENDPOINTS
# ============================================================

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

    except Exception as error:
        print(
            "MongoDB connection error:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "MongoDB connection failed. "
                "Check backend terminal."
            )
        )


# ============================================================
# 10. SELLER ENDPOINTS
# ============================================================

@app.post("/sellers/")
def create_seller(seller: Seller):

    seller_data = seller.model_dump()

    result = sellers_collection.insert_one(
        seller_data
    )

    return {
        "message": "Seller registered successfully!",
        "seller_id": str(result.inserted_id)
    }


@app.get("/sellers/")
def get_sellers():

    sellers = list(
        sellers_collection.find()
    )

    for seller in sellers:
        seller["_id"] = str(
            seller["_id"]
        )

    return sellers


# ============================================================
# 11. LISTING ENDPOINTS
# ============================================================

@app.get("/listings/")
def get_listings(category: str = None):

    query = {}

    if category:
        query["category"] = category

    listings = list(
        listings_collection.find(query)
    )

    for listing in listings:
        listing["_id"] = str(
            listing["_id"]
        )

    return listings


@app.get("/listings/{listing_id}")
def get_listing(listing_id: str):

    if not ObjectId.is_valid(listing_id):
        return {
            "error": "Invalid listing ID"
        }

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id)
    })

    if listing is None:
        return {
            "error": "Listing not found"
        }

    listing["_id"] = str(
        listing["_id"]
    )

    return listing


@app.post("/listings/")
def create_listing(
    listing: Listing,
    user: dict = Depends(verify_firebase_token)
):

    listing_data = listing.model_dump()

    # Use the authenticated Firebase UID.
    # Do not trust the seller_id sent by the client.

    listing_data["seller_id"] = user["uid"]

    result = listings_collection.insert_one(
        listing_data
    )

    return {
        "message": "Product listed successfully!",
        "listing_id": str(result.inserted_id),
        "seller_id": user["uid"]
    }


@app.delete("/listings/{listing_id}")
def delete_listing(
    listing_id: str,
    user: dict = Depends(verify_firebase_token)
):

    if not ObjectId.is_valid(listing_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid listing ID"
        )

    # Only the authenticated owner can delete
    # their own listing.

    result = listings_collection.delete_one({
        "_id": ObjectId(listing_id),
        "seller_id": user["uid"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail=(
                "Listing not found or "
                "not owned by this seller"
            )
        )

    return {
        "message": "Listing deleted successfully!",
        "listing_id": listing_id
    }


# ============================================================
# 12. BULK MATCHING ENGINE
# ============================================================

@app.post("/matching/")
def match_sellers(
    request: MatchingRequest
):

    try:
        # Retrieve current MSME product listings.

        listings = list(
            listings_collection.find({
                "quantity": {
                    "$gt": 0
                }
            })
        )

        # Run the existing matching algorithm.
        # matching_engine.py remains unchanged.

        result = match_products(
            request.model_dump(),
            listings
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        print(
            "Matching error:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to process matching request"
        )


# ============================================================
# 13. BUYER REQUEST ENDPOINTS
# ============================================================

@app.post("/requests/")
def create_request(
    request: BuyerRequest,
    user: dict = Depends(verify_firebase_token)
):

    if not ObjectId.is_valid(
        request.listing_id
    ):
        return {
            "error": "Invalid listing ID"
        }

    listing = listings_collection.find_one({
        "_id": ObjectId(request.listing_id)
    })

    if listing is None:
        return {
            "error": "Listing not found"
        }

    if request.required_quantity <= 0:
        return {
            "error": (
                "Quantity must be greater than zero"
            )
        }

    if (
        request.unit.lower()
        != listing["unit"].lower()
    ):
        return {
            "error": "Unit does not match the listing"
        }

    if (
        request.required_quantity
        > listing["quantity"]
    ):
        return {
            "error": (
                "Requested quantity exceeds "
                "available stock"
            )
        }

    request_data = {
        "listing_id": request.listing_id,
        "seller_id": listing["seller_id"],
        "seller_name": listing["seller_name"],
        "product_name": listing["product_name"],
        "buyer_id": user["uid"],
        "required_quantity": (
            request.required_quantity
        ),
        "unit": request.unit,
        "message": request.message,
        "status": "pending"
    }

    result = requests_collection.insert_one(
        request_data
    )

    return {
        "message": "Request sent successfully!",
        "request_id": str(result.inserted_id),
        "status": "pending"
    }


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
        request["_id"] = str(
            request["_id"]
        )

    return seller_requests


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
        request["_id"] = str(
            request["_id"]
        )

    return buyer_requests


# ============================================================
# 14. BUYER REQUEST STATUS MANAGEMENT
# ============================================================

@app.patch("/requests/{request_id}")
def update_request_status(
    request_id: str,
    update: RequestStatusUpdate,
    user: dict = Depends(verify_firebase_token)
):

    if not ObjectId.is_valid(request_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid request ID"
        )

    if update.status not in [
        "accepted",
        "rejected"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be accepted or rejected"
            )
        )

    buyer_request = requests_collection.find_one({
        "_id": ObjectId(request_id)
    })

    if buyer_request is None:
        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    listing = listings_collection.find_one({
        "_id": ObjectId(
            buyer_request["listing_id"]
        )
    })

    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    if listing["seller_id"] != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail=(
                "You are not authorized "
                "to update this request"
            )
        )

    if buyer_request["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=(
                "This request has already "
                "been processed"
            )
        )

    # --------------------------------------------------------
    # REJECT REQUEST
    # --------------------------------------------------------

    if update.status == "rejected":

        result = requests_collection.update_one(
            {
                "_id": ObjectId(request_id),
                "status": "pending"
            },
            {
                "$set": {
                    "status": "rejected"
                }
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

    # --------------------------------------------------------
    # ACCEPT REQUEST
    # --------------------------------------------------------

    # Deduct stock only when enough quantity exists.

    result = listings_collection.update_one(
        {
            "_id": ObjectId(
                buyer_request["listing_id"]
            ),
            "seller_id": user["uid"],
            "quantity": {
                "$gte": buyer_request[
                    "required_quantity"
                ]
            }
        },
        {
            "$inc": {
                "quantity": -buyer_request[
                    "required_quantity"
                ]
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "Insufficient stock or "
                "listing not found"
            )
        )

    # Update request status after stock deduction.

    status_result = requests_collection.update_one(
        {
            "_id": ObjectId(request_id),
            "status": "pending"
        },
        {
            "$set": {
                "status": "accepted"
            }
        }
    )

    if status_result.modified_count == 0:

        # Restore stock if the status update fails.

        listings_collection.update_one(
            {
                "_id": ObjectId(
                    buyer_request["listing_id"]
                )
            },
            {
                "$inc": {
                    "quantity": buyer_request[
                        "required_quantity"
                    ]
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
        "quantity_deducted": buyer_request[
            "required_quantity"
        ],
        "unit": buyer_request["unit"]
    }


# ============================================================
# 15. FIREBASE AUTHENTICATION TEST
# ============================================================

@app.get("/auth/me")
def get_current_user(
    user: dict = Depends(verify_firebase_token)
):

    return {
        "message": "Authentication successful!",
        "uid": user["uid"],
        "email": user.get("email")
    }


# ============================================================
# 16. CREATE BULK BUYING OPPORTUNITY
# ============================================================

@app.post(
    "/bulk-requests/",
    status_code=201
)
def create_bulk_opportunity(
    request: BulkOpportunityCreate,
    user: dict = Depends(verify_firebase_token)
):
    """
    Publish a marketplace-wide bulk buying request.

    Requires Firebase authentication.
    """

    data = request.model_dump(
        mode="json"
    )

    data["product_name"] = (
        data["product_name"].strip()
    )

    data["unit"] = (
        data["unit"].strip()
    )

    if (
        not data["product_name"]
        or not data["unit"]
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Product name and unit "
                "cannot be blank"
            )
        )

    if (
        request.deadline is not None
        and request.deadline
        < datetime.now(timezone.utc).date()
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Deadline cannot be in the past"
            )
        )

    data["buyer_id"] = user["uid"]

    data["buyer_name"] = (
        user.get("name")
        or user.get("email")
        or "Buyer"
    )

    data["status"] = "open"

    data["created_at"] = (
        datetime.now(timezone.utc)
    )

    result = bulk_requests_collection.insert_one(
        data
    )

    return {
        "message": "Bulk opportunity published",
        "bulk_request_id": str(
            result.inserted_id
        ),
        "status": "open"
    }


# ============================================================
# 17. AI SELLER RECOMMENDATIONS
# ============================================================

@app.get("/ai/seller/recommendations")
def get_seller_ai_recommendations(
    limit: int = Query(
        default=10,
        ge=1,
        le=50
    ),
    semantic: bool = True,
    user: dict = Depends(verify_firebase_token)
):
    """
    Recommend bulk-buying opportunities to a seller.

    Uses:
        - Seller's MongoDB listings
        - Open bulk buyer requests
        - Rule-based filtering
        - Semantic AI product similarity

    Does not modify stock or create orders.
    """

    seller_id = user["uid"]

    # Retrieve listings owned by the authenticated seller.

    seller_listings = list(
        listings_collection.find({
            "seller_id": seller_id,
            "quantity": {
                "$gt": 0
            }
        })
    )

    # Retrieve open bulk buying opportunities.

    opportunities = list(
        bulk_requests_collection.find({
            "status": "open"
        })
    )

    # Execute the hybrid AI recommendation engine.

    result = recommend_for_seller(
        seller_id=seller_id,
        listings=seller_listings,
        bulk_requests=opportunities,
        limit=limit,
        use_semantic=semantic
    )

    return result


# ============================================================
# END OF RURALRISE BACKEND
# ============================================================
