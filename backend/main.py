import os
import sys
import time
import uuid
import re
import hmac
import hashlib
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv

from fastapi import FastAPI, Header, Depends, HTTPException, Query, File, UploadFile, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from pymongo import MongoClient, ASCENDING, DESCENDING
import firebase_admin
from firebase_admin import credentials, auth

# ---------------------------------------------------------
# Environment & Logging Configuration
# ---------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ruralrise")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "ruralrise")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")

if not MONGODB_URI:
    logger.warning("MONGODB_URI environment variable not found. Database calls will fail.")

# Initialize MongoDB Client
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

sellers_collection = db["sellers"]
listings_collection = db["listings"]
requests_collection = db["requests"]
msme_profiles_collection = db["msme_profiles"]
users_collection = db["users"]
notifications_collection = db["notifications"]
bulk_requests_collection = db["bulk_requests"]
payments_collection = db["payments"]
worker_profiles_collection = db["worker_profiles"]
worker_services_collection = db["worker_services"]
worker_bookings_collection = db["worker_bookings"]

# Initialize Firebase Admin SDK safely
if not firebase_admin._apps:
    try:
        if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized with credentials from: {FIREBASE_CREDENTIALS_PATH}")
        else:
            firebase_admin.initialize_app()
            logger.info("Firebase Admin initialized with default credentials.")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

# Ensure static upload directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------
# Lifespan: Database Indexes on Startup
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Create performance and integrity indexes
        listings_collection.create_index([("seller_id", ASCENDING)])
        listings_collection.create_index([("category", ASCENDING)])
        listings_collection.create_index([("product_name", ASCENDING)])
        listings_collection.create_index([("price", ASCENDING)])
        listings_collection.create_index([("created_at", DESCENDING)])
        listings_collection.create_index([("status", ASCENDING)])

        requests_collection.create_index([("seller_id", ASCENDING), ("status", ASCENDING)])
        requests_collection.create_index([("buyer_id", ASCENDING), ("status", ASCENDING)])
        requests_collection.create_index([("listing_id", ASCENDING)])
        requests_collection.create_index([("created_at", DESCENDING)])

        msme_profiles_collection.create_index([("user_id", ASCENDING)], unique=True)
        users_collection.create_index([("uid", ASCENDING)], unique=True)
        notifications_collection.create_index([("user_id", ASCENDING), ("is_read", ASCENDING)])
        notifications_collection.create_index([("created_at", DESCENDING)])

        # Bulk Requests & Payments Indexes
        bulk_requests_collection.create_index([("buyer_id", ASCENDING), ("status", ASCENDING)])
        bulk_requests_collection.create_index([("product_name", ASCENDING)])
        bulk_requests_collection.create_index([("created_at", DESCENDING)])

        payments_collection.create_index([("user_id", ASCENDING)])
        payments_collection.create_index([("transaction_id", ASCENDING)], unique=True)
        payments_collection.create_index([("request_id", ASCENDING)])
        payments_collection.create_index([("status", ASCENDING)])

        # Worker Profiles & Bookings Indexes
        worker_profiles_collection.create_index([("user_id", ASCENDING)], unique=True)
        worker_profiles_collection.create_index([("skills", ASCENDING)])
        worker_services_collection.create_index([("worker_id", ASCENDING)])
        worker_bookings_collection.create_index([("worker_id", ASCENDING)])
        worker_bookings_collection.create_index([("client_id", ASCENDING)])

        logger.info("MongoDB indexes successfully created and verified.")
    except Exception as e:
        logger.warning(f"Could not initialize database indexes on startup: {e}")
    yield

# ---------------------------------------------------------
# FastAPI App Initialization
# ---------------------------------------------------------
app = FastAPI(
    title="RuralRise API",
    description="Complete Backend & Multi-Seller Matching Platform for Rural Producers, Artisans, Workers and MSMEs",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware Setup
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ruralrise.vercel.app",
    "https://ruralrise.web.app",
    "https://ruralrise-fdda3.web.app",
    "https://ruralrise-fdda3.firebaseapp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files for Uploaded Product Images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------
# Rate Limiting & Utility Helpers
# ---------------------------------------------------------
RATE_LIMIT_STORE: Dict[str, List[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 240
RATE_LIMIT_WINDOW_SECONDS = 60

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/uploads") or path.startswith("/docs") or path.startswith("/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()

    timestamps = RATE_LIMIT_STORE.get(client_ip, [])
    timestamps = [t for t in timestamps if current_time - t < RATE_LIMIT_WINDOW_SECONDS]
    
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please wait a moment before trying again."}
        )

    timestamps.append(current_time)
    RATE_LIMIT_STORE[client_ip] = timestamps

    response = await call_next(request)
    return response


def parse_object_id(id_str: str, resource_name: str = "Resource") -> ObjectId:
    if not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {resource_name} ID format"
        )
    return ObjectId(id_str)


def format_doc_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc


def create_in_app_notification(
    user_id: str,
    title: str,
    message: str,
    notif_type: str = "system",
    link: str = ""
):
    try:
        notifications_collection.insert_one({
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "link": link,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        })
    except Exception as e:
        logger.error(f"Error creating in-app notification: {e}")


# ---------------------------------------------------------
# Authentication & User Identification
# ---------------------------------------------------------
security = HTTPBearer(auto_error=False)

def verify_firebase_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing. Please log in."
        )

    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token, check_revoked=True)
        uid = decoded_token.get("uid")

        # Sync or ensure user record exists in users_collection
        user_record = users_collection.find_one({"uid": uid})
        if not user_record:
            users_collection.update_one(
                {"uid": uid},
                {
                    "$set": {
                        "uid": uid,
                        "email": decoded_token.get("email", ""),
                        "name": decoded_token.get("name", "Rural Producer"),
                        "role": decoded_token.get("role", "seller"),
                        "is_active": True,
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            decoded_token["role"] = decoded_token.get("role", "seller")
            decoded_token["name"] = decoded_token.get("name", "Rural Producer")
        else:
            # Check user deactivation status to prevent deactivated users from accessing protected APIs
            if user_record.get("is_active") is False or user_record.get("status") == "deactivated":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Access denied. Please contact support."
                )

            decoded_token["role"] = user_record.get("role", decoded_token.get("role", "seller"))
            decoded_token["name"] = user_record.get("name", decoded_token.get("name", ""))

        return decoded_token
    except HTTPException:
        raise
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token has been revoked. Please log in again."
        )
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token"
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    try:
        decoded = auth.verify_id_token(credentials.credentials)
        uid = decoded.get("uid")
        user_record = users_collection.find_one({"uid": uid})
        if user_record and (user_record.get("is_active") is False or user_record.get("status") == "deactivated"):
            return None
        return decoded
    except Exception:
        return None


# ---------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------
LISTING_CATEGORIES = Literal[
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

CAPACITY_UNITS = Literal[
    "kg",
    "quintal",
    "tonnes",
    "pieces",
    "litres",
    "jars",
    "packs",
    "dozens",
    "meters"
]

ROLE_TYPES = Literal[
    "buyer",
    "seller",
    "worker",
    "artisan",
    "msme",
    "admin"
]

class Seller(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=15)
    village: str = Field(min_length=2, max_length=100)
    state: str = Field(default="India", max_length=100)
    products: list[str] = Field(default_factory=list)

class SellerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None
    state: Optional[str] = None
    products: Optional[list[str]] = None

class SellerVerificationRequest(BaseModel):
    id_proof_type: str = Field(min_length=2, max_length=50, description="e.g. Aadhaar, VoterID, PAN, FSSAI, Udyam")
    id_number: str = Field(min_length=4, max_length=50)
    document_url: Optional[str] = Field(default=None, max_length=1000)
    notes: Optional[str] = Field(default=None, max_length=500)

class SellerVerificationReview(BaseModel):
    is_verified: bool
    verification_notes: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    location: Optional[str] = Field(default=None, max_length=200)
    village: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=500)
    avatar_url: Optional[str] = Field(default=None, max_length=1000)

class UserRoleChange(BaseModel):
    role: ROLE_TYPES

class Listing(BaseModel):
    category: LISTING_CATEGORIES
    product_name: str = Field(min_length=2, max_length=150)
    seller_name: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    village: str = Field(min_length=2, max_length=100)
    unit: str = Field(min_length=1, max_length=30)
    quantity: float = Field(gt=0, description="Available quantity must be positive")
    price: float = Field(gt=0, description="Price per unit must be positive")
    description: str = Field(default="", max_length=2000)
    image_url: str = Field(default="", max_length=1000)
    seller_id: Optional[str] = None

class ListingUpdate(BaseModel):
    price: Optional[float] = Field(default=None, gt=0)
    quantity: Optional[float] = Field(default=None, ge=0)
    product_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    category: Optional[LISTING_CATEGORIES] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[Literal["active", "inactive", "out_of_stock"]] = None
    is_active: Optional[bool] = None

class BuyerRequest(BaseModel):
    listing_id: str
    required_quantity: float = Field(gt=0, description="Requested quantity must be positive")
    unit: str = Field(min_length=1, max_length=30)
    message: str = Field(default="", max_length=1000)
    buyer_name: Optional[str] = Field(default=None, max_length=100)
    delivery_location: Optional[str] = Field(default=None, max_length=200)
    contact: Optional[str] = Field(default=None, max_length=100)

class RequestStatusUpdate(BaseModel):
    status: Literal["accepted", "rejected"]

class MSMEProfile(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)
    products: list[str] = Field(min_length=1)
    skills: list[str] = Field(min_length=1)
    materials: list[str] = Field(min_length=1)
    state: str = Field(min_length=2, max_length=100)
    village: str = Field(min_length=2, max_length=100)
    capacity: float = Field(gt=0)
    capacity_unit: CAPACITY_UNITS

class MatchingRequest(BaseModel):
    product_name: str = Field(min_length=2, max_length=150)
    required_quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=30)
    location: Optional[str] = Field(default=None, max_length=100)

class AIDescriptionRequest(BaseModel):
    product_name: str = Field(min_length=2, max_length=150)
    category: str = Field(min_length=2, max_length=100)
    materials: Optional[str] = Field(default=None, max_length=200)

class AIAdvisoryRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    category: Optional[str] = None
    location: Optional[str] = None

# Bulk Requests Schemas
class BulkRequestCreate(BaseModel):
    product_name: str = Field(min_length=2, max_length=150)
    required_quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=30)
    delivery_location: Optional[str] = Field(default=None, max_length=200)
    target_price: Optional[float] = Field(default=None, gt=0)
    needed_by: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default="", max_length=1000)
    auto_match_and_dispatch: bool = Field(default=False, description="Automatically place sub-requests to matched producers with atomic stock reservation")

class BulkRequestOffer(BaseModel):
    offered_quantity: float = Field(gt=0)
    unit_price: float = Field(gt=0)
    notes: Optional[str] = Field(default="", max_length=500)

# Payment Schemas
class PaymentCreate(BaseModel):
    request_id: Optional[str] = None
    bulk_request_id: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0, description="Optional: server calculates amount authoritatively from linked order")
    currency: str = Field(default="INR", max_length=10)
    payment_method: Literal["upi", "card", "netbanking", "wallet", "cod", "escrow"] = "upi"
    notes: Optional[str] = Field(default="", max_length=500)

class PaymentVerify(BaseModel):
    transaction_id: str
    gateway_order_id: str
    gateway_payment_id: str
    signature: str

# Worker & Artisan Schemas
class WorkerProfileCreate(BaseModel):
    worker_name: str = Field(min_length=2, max_length=100)
    skills: list[str] = Field(min_length=1)
    experience_years: float = Field(ge=0)
    daily_rate: float = Field(gt=0)
    hourly_rate: Optional[float] = Field(default=None, gt=0)
    state: str = Field(min_length=2, max_length=100)
    village: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    bio: Optional[str] = Field(default="", max_length=1000)
    is_available: bool = True

class WorkerServiceCreate(BaseModel):
    service_title: str = Field(min_length=2, max_length=150)
    category: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=1500)
    rate: float = Field(gt=0)
    rate_unit: Literal["per_day", "per_hour", "per_acre", "per_piece", "per_project"] = "per_day"

class WorkerBookingCreate(BaseModel):
    worker_id: str
    service_id: Optional[str] = None
    job_description: str = Field(min_length=5, max_length=1000)
    start_date: str = Field(min_length=4, max_length=50)
    duration_days: float = Field(gt=0, default=1.0)
    location: str = Field(min_length=2, max_length=200)
    offered_compensation: float = Field(gt=0)

class WorkerBookingStatusUpdate(BaseModel):
    status: Literal["accepted", "declined", "in_progress", "completed", "cancelled"]
    notes: Optional[str] = None


# =========================================================
# PHASE 1 & FOUNDATION: Health and Status Endpoints
# =========================================================

@app.get("/", tags=["System"])
def home():
    return {
        "message": "Welcome to RuralRise API!",
        "version": "2.0.0",
        "description": "Backend API powering grassroots producers, rural artisans, skilled workers, and multi-seller bulk matching.",
        "status": "Running successfully",
        "documentation": "/docs"
    }

@app.get("/health", tags=["System"])
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/db-health", tags=["System"])
def database_health():
    try:
        client.admin.command("ping")
        return {
            "status": "connected",
            "database": DB_NAME,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return {
            "status": "error",
            "message": "Database connection failed",
            "detail": str(e)
        }


# =========================================================
# PHASE 2: Authentication and User Profile Management
# =========================================================

@app.get("/auth/me", tags=["Authentication"])
def get_current_user_profile(user: dict = Depends(verify_firebase_token)):
    user_record = users_collection.find_one({"uid": user["uid"]})
    return {
        "message": "Authentication successful!",
        "uid": user["uid"],
        "email": user.get("email"),
        "role": user_record.get("role", user.get("role", "seller")) if user_record else user.get("role", "seller"),
        "name": user_record.get("name") if user_record else user.get("name", ""),
        "location": user_record.get("location", "") if user_record else "",
        "village": user_record.get("village", "") if user_record else "",
        "state": user_record.get("state", "") if user_record else "",
        "bio": user_record.get("bio", "") if user_record else "",
        "is_active": user_record.get("is_active", True) if user_record else True
    }

@app.get("/users/me", tags=["User Profile"])
def get_user_profile(user: dict = Depends(verify_firebase_token)):
    user_record = users_collection.find_one({"uid": user["uid"]})
    if not user_record:
        return {
            "uid": user["uid"],
            "email": user.get("email", ""),
            "role": user.get("role", "seller"),
            "name": user.get("name", ""),
            "phone": "",
            "location": "",
            "village": "",
            "state": "",
            "bio": "",
            "is_active": True
        }
    return format_doc_id(user_record)

@app.put("/users/me", tags=["User Profile"])
@app.patch("/users/me", tags=["User Profile"])
def update_user_profile(
    profile_update: UserProfileUpdate,
    user: dict = Depends(verify_firebase_token)
):
    update_data = {k: v for k, v in profile_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    # Automatically synchronize location if village or state updated
    if "village" in update_data or "state" in update_data:
        curr = users_collection.find_one({"uid": user["uid"]}) or {}
        v = update_data.get("village", curr.get("village", ""))
        s = update_data.get("state", curr.get("state", ""))
        if v or s:
            update_data["location"] = f"{v}, {s}".strip(", ")

    users_collection.update_one(
        {"uid": user["uid"]},
        {"$set": update_data},
        upsert=True
    )

    return {
        "message": "User profile updated successfully!",
        "uid": user["uid"],
        "updated_fields": list(update_data.keys())
    }

@app.patch("/users/me/role", tags=["User Profile"])
@app.post("/users/me/role", tags=["User Profile"])
def update_user_role(
    role_change: UserRoleChange,
    user: dict = Depends(verify_firebase_token)
):
    """
    Dedicated endpoint with strict validation for switching or setting user roles.
    Prevents unauthorized or arbitrary role changes via standard profile edit.
    """
    new_role = role_change.role
    users_collection.update_one(
        {"uid": user["uid"]},
        {
            "$set": {
                "role": new_role,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    create_in_app_notification(
        user_id=user["uid"],
        title="Role Updated",
        message=f"Your account role has been updated to '{new_role}'.",
        notif_type="system",
        link="/dashboard"
    )

    return {
        "message": f"Account role successfully updated to '{new_role}'",
        "uid": user["uid"],
        "role": new_role
    }

@app.delete("/users/me", tags=["User Profile"])
def delete_user_account(user: dict = Depends(verify_firebase_token)):
    # Soft delete / deactivate user account
    users_collection.update_one(
        {"uid": user["uid"]},
        {
            "$set": {
                "is_active": False,
                "status": "deactivated",
                "deactivated_at": datetime.now(timezone.utc)
            }
        }
    )
    # Deactivate seller's listings
    listings_collection.update_many(
        {"seller_id": user["uid"]},
        {"$set": {"status": "inactive", "is_active": False}}
    )
    # Deactivate worker services & profile
    worker_profiles_collection.update_one(
        {"user_id": user["uid"]},
        {"$set": {"is_available": False, "is_active": False}}
    )

    return {"message": "Account deactivated successfully."}


# =========================================================
# PHASE 3: Seller, MSME, and Verification Management
# =========================================================

@app.post("/sellers/", tags=["Sellers"])
def create_seller(seller: Seller, current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Register a rural producer or seller.
    New sellers are initialized as unverified until verified via credentials/audit.
    """
    seller_data = seller.model_dump()
    seller_data["created_at"] = datetime.now(timezone.utc)
    seller_data["updated_at"] = datetime.now(timezone.utc)
    seller_data["is_verified"] = False
    seller_data["verification_status"] = "unverified"
    
    if current_user:
        seller_data["user_id"] = current_user.get("uid")

    result = sellers_collection.insert_one(seller_data)

    return {
        "message": "Seller registered successfully! Pending verification.",
        "seller_id": str(result.inserted_id),
        "is_verified": False,
        "verification_status": "unverified"
    }

@app.post("/sellers/{seller_id}/request-verification", tags=["Sellers"])
def request_seller_verification(
    seller_id: str,
    verification: SellerVerificationRequest,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(seller_id, "Seller")
    seller = sellers_collection.find_one({"_id": obj_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    # Authorize: user must be linked or matched
    if seller.get("user_id") and seller.get("user_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="You are not authorized to request verification for this seller")

    verification_data = verification.model_dump()
    verification_data["submitted_at"] = datetime.now(timezone.utc)

    sellers_collection.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "verification_status": "pending",
                "verification_request": verification_data,
                "user_id": user["uid"],
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    create_in_app_notification(
        user_id=user["uid"],
        title="Verification Request Submitted",
        message="Your seller verification request is under review. Our village liaison team will inspect your documentation.",
        notif_type="verification",
        link="/dashboard"
    )

    return {
        "message": "Verification request submitted successfully!",
        "seller_id": seller_id,
        "verification_status": "pending"
    }

@app.patch("/sellers/{seller_id}/verify", tags=["Sellers"])
def review_seller_verification(
    seller_id: str,
    review: SellerVerificationReview,
    user: dict = Depends(verify_firebase_token)
):
    """
    Admin/Reviewer endpoint to approve or revoke seller verification.
    """
    obj_id = parse_object_id(seller_id, "Seller")
    seller = sellers_collection.find_one({"_id": obj_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    new_status = "verified" if review.is_verified else "rejected"
    sellers_collection.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "is_verified": review.is_verified,
                "verification_status": new_status,
                "verification_notes": review.verification_notes or "",
                "verified_at": datetime.now(timezone.utc) if review.is_verified else None,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if seller.get("user_id"):
        create_in_app_notification(
            user_id=seller["user_id"],
            title="Producer Verification Update",
            message=f"Your producer profile verification is now: {new_status.upper()}.",
            notif_type="verification",
            link="/dashboard"
        )

    return {
        "message": f"Seller verification status updated to '{new_status}'",
        "seller_id": seller_id,
        "is_verified": review.is_verified,
        "verification_status": new_status
    }

@app.get("/sellers/", tags=["Sellers"])
def get_sellers(
    state: Optional[str] = None,
    village: Optional[str] = None,
    verified_only: bool = False,
    limit: int = Query(50, ge=1, le=100)
):
    query: Dict[str, Any] = {}
    if state:
        query["state"] = {"$regex": f"^{state.strip()}$", "$options": "i"}
    if village:
        query["village"] = {"$regex": f"^{village.strip()}$", "$options": "i"}
    if verified_only:
        query["is_verified"] = True

    sellers = list(sellers_collection.find(query).limit(limit))
    return [format_doc_id(s) for s in sellers]

@app.get("/sellers/{seller_id}", tags=["Sellers"])
def get_seller_by_id(seller_id: str):
    obj_id = parse_object_id(seller_id, "Seller")
    seller = sellers_collection.find_one({"_id": obj_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return format_doc_id(seller)

@app.get("/sellers/dashboard/stats", tags=["Sellers"])
def get_seller_dashboard_stats(user: dict = Depends(verify_firebase_token)):
    seller_uid = user["uid"]
    
    total_listings = listings_collection.count_documents({"seller_id": seller_uid})
    active_listings = listings_collection.count_documents({
        "seller_id": seller_uid,
        "status": "active",
        "quantity": {"$gt": 0}
    })
    
    requests = list(requests_collection.find({"seller_id": seller_uid}))
    total_requests = len(requests)
    pending_requests = sum(1 for r in requests if r.get("status") == "pending")
    accepted_requests = sum(1 for r in requests if r.get("status") == "accepted")
    rejected_requests = sum(1 for r in requests if r.get("status") == "rejected")
    
    total_revenue = sum(
        float(r.get("total_estimated_price", 0))
        for r in requests
        if r.get("status") == "accepted"
    )

    return {
        "total_listings": total_listings,
        "active_listings": active_listings,
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "accepted_requests": accepted_requests,
        "rejected_requests": rejected_requests,
        "total_revenue": round(total_revenue, 2)
    }

@app.get("/msme-profiles/me", tags=["MSME Profiles"])
def get_my_msme_profile(user: dict = Depends(verify_firebase_token)):
    profile = msme_profiles_collection.find_one(
        {"user_id": user["uid"]},
        {"_id": 0}
    )
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="MSME profile not found. Please complete your profile."
        )
    return profile

@app.post("/msme-profiles/", tags=["MSME Profiles"])
def create_or_update_msme_profile(
    profile: MSMEProfile,
    user: dict = Depends(verify_firebase_token)
):
    profile_data = profile.model_dump()
    profile_data["user_id"] = user["uid"]
    profile_data["updated_at"] = datetime.now(timezone.utc)
    profile_data["verification_status"] = "verified"

    msme_profiles_collection.update_one(
        {"user_id": user["uid"]},
        {
            "$set": profile_data,
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    create_in_app_notification(
        user_id=user["uid"],
        title="MSME Profile Saved",
        message=f"Your enterprise profile for '{profile.business_name}' is now active and verified.",
        notif_type="profile",
        link="/msme-profile"
    )

    return {
        "message": "MSME profile saved successfully!",
        "user_id": user["uid"],
        "business_name": profile.business_name
    }


# =========================================================
# PHASE 4: Product Marketplace
# =========================================================

@app.post("/listings/", tags=["Marketplace"])
def create_listing(
    listing: Listing,
    user: dict = Depends(verify_firebase_token)
):
    listing_data = listing.model_dump()

    listing_data["seller_id"] = user["uid"]
    listing_data["seller_name"] = listing.seller_name.strip() or user.get("name", "Rural Producer")
    listing_data["is_active"] = True
    listing_data["status"] = "active"
    listing_data["created_at"] = datetime.now(timezone.utc)
    listing_data["updated_at"] = datetime.now(timezone.utc)

    result = listings_collection.insert_one(listing_data)

    create_in_app_notification(
        user_id=user["uid"],
        title="Product Published",
        message=f"Your listing '{listing.product_name}' ({listing.quantity} {listing.unit}) is now live in the marketplace.",
        notif_type="listing",
        link=f"/product/{result.inserted_id}"
    )

    return {
        "message": "Product listed successfully!",
        "listing_id": str(result.inserted_id),
        "seller_id": user["uid"],
        "status": "active"
    }

@app.get("/listings/", tags=["Marketplace"])
def get_listings(
    category: Optional[str] = None,
    search: Optional[str] = None,
    q: Optional[str] = None,
    state: Optional[str] = None,
    village: Optional[str] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    include_out_of_stock: bool = Query(False, description="Include products with zero stock or marked out_of_stock"),
    sort_by: Optional[str] = Query("newest", pattern="^(newest|oldest|price_asc|price_desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    query: Dict[str, Any] = {
        "is_active": {"$ne": False}
    }

    # Hide out of stock items by default so buyers only see purchasable items
    if not include_out_of_stock:
        query["status"] = "active"
        query["quantity"] = {"$gt": 0}

    # Category filter
    if category and category.strip().lower() not in ["all", ""]:
        query["category"] = category.strip()

    # Search keyword filter
    search_term = (search or q or "").strip()
    if search_term:
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"product_name": {"$regex": re.escape(search_term), "$options": "i"}},
                {"description": {"$regex": re.escape(search_term), "$options": "i"}},
                {"village": {"$regex": re.escape(search_term), "$options": "i"}},
                {"seller_name": {"$regex": re.escape(search_term), "$options": "i"}}
            ]
        })

    # Location filters
    if state and state.strip():
        query["state"] = {"$regex": f"^{re.escape(state.strip())}$", "$options": "i"}
    if village and village.strip():
        query["village"] = {"$regex": f"^{re.escape(village.strip())}$", "$options": "i"}

    # Price range filter
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None:
            price_query["$gte"] = min_price
        if max_price is not None:
            price_query["$lte"] = max_price
        query["price"] = price_query

    sort_mapping = {
        "newest": [("created_at", DESCENDING), ("_id", DESCENDING)],
        "oldest": [("created_at", ASCENDING), ("_id", ASCENDING)],
        "price_asc": [("price", ASCENDING)],
        "price_desc": [("price", DESCENDING)]
    }
    sort_fields = sort_mapping.get(sort_by, [("created_at", DESCENDING)])

    skip = (page - 1) * limit
    listings = list(listings_collection.find(query).sort(sort_fields).skip(skip).limit(limit))

    return [format_doc_id(l) for l in listings]

@app.get("/listings/seller/me", tags=["Marketplace"])
def get_my_seller_listings(user: dict = Depends(verify_firebase_token)):
    listings = list(
        listings_collection.find({"seller_id": user["uid"]}).sort("created_at", DESCENDING)
    )
    return [format_doc_id(l) for l in listings]

@app.get("/listings/{listing_id}", tags=["Marketplace"])
def get_listing(listing_id: str):
    obj_id = parse_object_id(listing_id, "Listing")
    listing = listings_collection.find_one({"_id": obj_id})
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return format_doc_id(listing)

@app.put("/listings/{listing_id}", tags=["Marketplace"])
@app.patch("/listings/{listing_id}", tags=["Marketplace"])
def update_listing(
    listing_id: str,
    update_data: ListingUpdate,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(listing_id, "Listing")
    listing = listings_collection.find_one({"_id": obj_id})
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.get("seller_id") != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to edit this listing"
        )

    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        return {"message": "No changes submitted.", "listing_id": listing_id}

    # Automatically synchronize status based on updated quantity
    if "quantity" in updates:
        if updates["quantity"] <= 0:
            updates["status"] = "out_of_stock"
        elif updates.get("status") != "inactive" and updates["quantity"] > 0:
            updates["status"] = "active"

    updates["updated_at"] = datetime.now(timezone.utc)
    listings_collection.update_one({"_id": obj_id}, {"$set": updates})

    return {
        "message": "Listing updated successfully!",
        "listing_id": listing_id,
        "updated_fields": list(updates.keys())
    }

@app.delete("/listings/{listing_id}", tags=["Marketplace"])
def delete_listing(
    listing_id: str,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(listing_id, "Listing")
    listing = listings_collection.find_one({"_id": obj_id})
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.get("seller_id") != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to delete this listing"
        )

    listings_collection.delete_one({"_id": obj_id, "seller_id": user["uid"]})

    return {
        "message": "Listing deleted successfully!",
        "listing_id": listing_id
    }


# =========================================================
# PHASE 5: Buyer Request Management & Atomic Stock Updates
# =========================================================

@app.post("/requests/", tags=["Requests"])
def create_request(
    request: BuyerRequest,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(request.listing_id, "Listing")

    listing = listings_collection.find_one({"_id": obj_id})
    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    if listing.get("is_active") is False or listing.get("status") == "inactive":
        raise HTTPException(
            status_code=400,
            detail="This listing is no longer active"
        )

    available_stock = float(listing.get("quantity", 0))
    if available_stock <= 0 or listing.get("status") == "out_of_stock":
        raise HTTPException(
            status_code=409,
            detail="This product is currently out of stock"
        )

    if listing.get("seller_id") == user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="You cannot submit an order request for your own listing"
        )

    if request.required_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    listing_unit = listing.get("unit", "").strip().lower()
    requested_unit = request.unit.strip().lower()
    if requested_unit != listing_unit:
        raise HTTPException(
            status_code=400,
            detail=f"Unit '{request.unit}' does not match listing unit '{listing.get('unit')}'"
        )

    if request.required_quantity > available_stock:
        raise HTTPException(
            status_code=409,
            detail=f"Requested quantity ({request.required_quantity}) exceeds available stock ({available_stock} {listing.get('unit')})"
        )

    unit_price = float(listing.get("price", 0))
    total_estimated_price = round(request.required_quantity * unit_price, 2)

    now = datetime.now(timezone.utc)
    request_data = {
        "listing_id": request.listing_id,
        "seller_id": listing["seller_id"],
        "seller_name": listing.get("seller_name", "Rural Producer"),
        "product_name": listing.get("product_name", "Produce"),
        "buyer_id": user["uid"],
        "buyer_name": request.buyer_name or user.get("name") or "Verified Buyer",
        "buyer_email": user.get("email", ""),
        "delivery_location": request.delivery_location or f"{listing.get('village', '')}, {listing.get('state', '')}",
        "contact": request.contact or user.get("email", ""),
        "required_quantity": request.required_quantity,
        "unit": listing.get("unit"),
        "price_per_unit": unit_price,
        "total_estimated_price": total_estimated_price,
        "message": request.message.strip(),
        "status": "pending",
        "is_paid": False,
        "created_at": now,
        "updated_at": now
    }

    result = requests_collection.insert_one(request_data)
    request_id_str = str(result.inserted_id)

    create_in_app_notification(
        user_id=listing["seller_id"],
        title="New Order Request Received!",
        message=f"{request_data['buyer_name']} requested {request.required_quantity} {listing.get('unit')} of {listing.get('product_name')}.",
        notif_type="order_request",
        link="/dashboard"
    )

    return {
        "message": "Order request sent successfully!",
        "request_id": request_id_str,
        "status": "pending",
        "total_estimated_price": total_estimated_price
    }

@app.get("/requests/seller/me", tags=["Requests"])
def get_seller_requests(user: dict = Depends(verify_firebase_token)):
    seller_requests = list(
        requests_collection.find({"seller_id": user["uid"]}).sort("created_at", DESCENDING)
    )
    return [format_doc_id(r) for r in seller_requests]

@app.get("/requests/buyer/me", tags=["Requests"])
def get_buyer_requests(user: dict = Depends(verify_firebase_token)):
    buyer_requests = list(
        requests_collection.find({"buyer_id": user["uid"]}).sort("created_at", DESCENDING)
    )
    return [format_doc_id(r) for r in buyer_requests]

@app.patch("/requests/{request_id}", tags=["Requests"])
def update_request_status(
    request_id: str,
    update: RequestStatusUpdate,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(request_id, "Request")

    buyer_request = requests_collection.find_one({"_id": obj_id})
    if buyer_request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    if buyer_request.get("seller_id") != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update this request"
        )

    if buyer_request.get("status") != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"This request has already been processed (Current status: {buyer_request.get('status')})"
        )

    if update.status == "rejected":
        result = requests_collection.update_one(
            {"_id": obj_id, "status": "pending"},
            {
                "$set": {
                    "status": "rejected",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=409, detail="Request could not be updated")

        create_in_app_notification(
            user_id=buyer_request["buyer_id"],
            title="Order Request Update",
            message=f"Your request for {buyer_request.get('required_quantity')} {buyer_request.get('unit')} of {buyer_request.get('product_name')} was declined.",
            notif_type="order_status",
            link="/dashboard"
        )

        return {
            "message": "Request rejected successfully",
            "stock_deducted": False,
            "status": "rejected"
        }

    # Acceptance flow: Atomic stock deduction
    listing_obj_id = parse_object_id(buyer_request["listing_id"], "Listing")
    qty_to_deduct = float(buyer_request["required_quantity"])

    stock_result = listings_collection.update_one(
        {
            "_id": listing_obj_id,
            "seller_id": user["uid"],
            "quantity": {"$gte": qty_to_deduct}
        },
        {
            "$inc": {"quantity": -qty_to_deduct},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    if stock_result.modified_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Insufficient stock or listing no longer available"
        )

    updated_listing = listings_collection.find_one({"_id": listing_obj_id})
    if updated_listing and updated_listing.get("quantity", 0) <= 0:
        listings_collection.update_one(
            {"_id": listing_obj_id},
            {"$set": {"status": "out_of_stock"}}
        )

    status_result = requests_collection.update_one(
        {"_id": obj_id, "status": "pending"},
        {
            "$set": {
                "status": "accepted",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if status_result.modified_count == 0:
        listings_collection.update_one(
            {"_id": listing_obj_id},
            {
                "$inc": {"quantity": qty_to_deduct},
                "$set": {"status": "active"}
            }
        )
        raise HTTPException(
            status_code=409,
            detail="Failed to finalize request status. Stock deduction was safely rolled back."
        )

    create_in_app_notification(
        user_id=buyer_request["buyer_id"],
        title="Order Request Accepted! 🎉",
        message=f"Seller accepted your order for {qty_to_deduct} {buyer_request.get('unit')} of {buyer_request.get('product_name')}. Proceed to payment in Dashboard.",
        notif_type="order_status",
        link="/dashboard"
    )

    return {
        "message": "Request accepted successfully!",
        "stock_deducted": True,
        "quantity_deducted": qty_to_deduct,
        "unit": buyer_request.get("unit"),
        "status": "accepted"
    }

@app.post("/requests/{request_id}/cancel", tags=["Requests"])
@app.patch("/requests/{request_id}/cancel", tags=["Requests"])
def cancel_buyer_request(
    request_id: str,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(request_id, "Request")

    # Atomic conditional update eliminating race condition
    now = datetime.now(timezone.utc)
    result = requests_collection.update_one(
        {
            "_id": obj_id,
            "buyer_id": user["uid"],
            "status": "pending"
        },
        {
            "$set": {
                "status": "cancelled",
                "updated_at": now
            }
        }
    )

    if result.modified_count == 0:
        latest = requests_collection.find_one({"_id": obj_id})
        if not latest:
            raise HTTPException(status_code=404, detail="Request not found")
        if latest.get("buyer_id") != user["uid"]:
            raise HTTPException(status_code=403, detail="You can only cancel your own requests")
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel request. It has already been processed (Current status: {latest.get('status')})"
        )

    # Fetch seller to notify
    buyer_request = requests_collection.find_one({"_id": obj_id})
    if buyer_request and buyer_request.get("seller_id"):
        create_in_app_notification(
            user_id=buyer_request["seller_id"],
            title="Order Request Cancelled",
            message=f"{buyer_request.get('buyer_name', 'Buyer')} cancelled their request for {buyer_request.get('product_name')}.",
            notif_type="order_cancelled",
            link="/dashboard"
        )

    return {"message": "Request cancelled successfully", "status": "cancelled"}


# =========================================================
# PHASE 6: Advanced Multi-Seller Matching Engine
# =========================================================

@app.post("/matching/", tags=["Matching Engine"])
def match_sellers(request: MatchingRequest):
    """
    Advanced matching engine:
    1. Excludes out-of-stock and inactive listings.
    2. Sorts candidates by localized proximity and farm-gate unit price.
    3. Prefers verified sellers and provides transparency on fulfillment and shortfall.
    """
    query: Dict[str, Any] = {
        "product_name": {
            "$regex": f"^{re.escape(request.product_name.strip())}$",
            "$options": "i"
        },
        "unit": {
            "$regex": f"^{re.escape(request.unit.strip())}$",
            "$options": "i"
        },
        "quantity": {"$gt": 0},
        "status": "active",
        "is_active": {"$ne": False}
    }

    all_candidates = list(listings_collection.find(query).sort("price", ASCENDING))

    # Cross-reference seller verification status
    seller_ids = [c.get("seller_id") for c in all_candidates if c.get("seller_id")]
    verified_seller_uids = set()
    if seller_ids:
        verified_sellers = sellers_collection.find({"user_id": {"$in": seller_ids}, "is_verified": True})
        verified_seller_uids = {s.get("user_id") for s in verified_sellers}

    for c in all_candidates:
        c["is_verified"] = c.get("seller_id") in verified_seller_uids

    # Location-based priority
    if request.location and request.location.strip():
        loc = request.location.strip().lower()
        local_candidates = [
            c for c in all_candidates
            if loc in c.get("state", "").lower() or loc in c.get("village", "").lower()
        ]
        other_candidates = [
            c for c in all_candidates
            if c not in local_candidates
        ]
        listings = local_candidates + other_candidates
    else:
        listings = all_candidates

    remaining_quantity = float(request.required_quantity)
    matched_quantity = 0.0
    total_estimated_cost = 0.0
    matches = []

    for listing in listings:
        if remaining_quantity <= 0:
            break

        available = float(listing.get("quantity", 0))
        if available <= 0:
            continue

        quantity_to_take = min(available, remaining_quantity)
        price_per_unit = float(listing.get("price", 0))
        allocation_cost = round(quantity_to_take * price_per_unit, 2)

        is_local = False
        if request.location and request.location.strip():
            loc = request.location.strip().lower()
            is_local = loc in listing.get("state", "").lower() or loc in listing.get("village", "").lower()

        matches.append({
            "listing_id": str(listing["_id"]),
            "seller_id": listing.get("seller_id"),
            "seller_name": listing.get("seller_name", "Rural Producer"),
            "is_verified": bool(listing.get("is_verified", False)),
            "available_quantity": quantity_to_take,
            "unit": listing.get("unit"),
            "price": price_per_unit,
            "subtotal": allocation_cost,
            "state": listing.get("state", ""),
            "village": listing.get("village", ""),
            "is_local_match": is_local
        })

        matched_quantity += quantity_to_take
        total_estimated_cost += allocation_cost
        remaining_quantity -= quantity_to_take

    is_fulfilled = matched_quantity >= request.required_quantity
    shortfall = max(0.0, request.required_quantity - matched_quantity)

    explanation = (
        f"Aggregated {len(matches)} producer(s) to supply {matched_quantity} {request.unit} "
        f"out of {request.required_quantity} {request.unit} requested."
    )
    if is_fulfilled:
        explanation += " Order can be fully fulfilled at the indicated rates."
    else:
        explanation += f" Shortfall of {round(shortfall, 2)} {request.unit} remains."

    return {
        "product_name": request.product_name,
        "required_quantity": request.required_quantity,
        "matched_quantity": round(matched_quantity, 2),
        "shortfall": round(shortfall, 2),
        "unit": request.unit,
        "is_fulfilled": is_fulfilled,
        "estimated_total_cost": round(total_estimated_cost, 2),
        "match_explanation": explanation,
        "matches": matches
    }


# =========================================================
# PHASE 7: Bulk Requests & Wholesale Aggregation
# =========================================================

def sanitize_bulk_request(doc: Dict[str, Any], viewer_uid: Optional[str] = None) -> Dict[str, Any]:
    """Sanitize bulk request document to protect buyer privacy on public endpoints."""
    if not doc:
        return doc
    doc = format_doc_id(doc)
    is_owner = viewer_uid and (doc.get("buyer_id") == viewer_uid)

    sanitized = {
        "_id": doc.get("_id"),
        "product_name": doc.get("product_name"),
        "required_quantity": doc.get("required_quantity"),
        "unit": doc.get("unit"),
        "delivery_location": doc.get("delivery_location"),
        "target_price": doc.get("target_price"),
        "needed_by": doc.get("needed_by"),
        "notes": doc.get("notes"),
        "status": doc.get("status"),
        "matched_quantity": doc.get("matched_quantity"),
        "is_fulfilled": doc.get("is_fulfilled"),
        "total_estimated_cost": doc.get("total_estimated_cost"),
        "created_at": doc.get("created_at"),
        "offers_count": len(doc.get("offers", []))
    }

    if is_owner:
        sanitized["buyer_id"] = doc.get("buyer_id")
        sanitized["buyer_name"] = doc.get("buyer_name")
        sanitized["buyer_email"] = doc.get("buyer_email")
        sanitized["allocations"] = doc.get("allocations", [])
        sanitized["offers"] = doc.get("offers", [])
        sanitized["dispatched_request_ids"] = doc.get("dispatched_request_ids", [])
    else:
        sanitized["buyer_name"] = "Verified Bulk Buyer"
        if viewer_uid:
            sanitized["my_offers"] = [
                o for o in doc.get("offers", [])
                if o.get("seller_id") == viewer_uid
            ]
    return sanitized


@app.post("/bulk-requests/", tags=["Bulk Requests"])
def create_bulk_request(
    bulk_in: BulkRequestCreate,
    user: dict = Depends(verify_firebase_token)
):
    """
    Create a bulk procurement requirement.
    Executes matching and optionally reserves stock atomically and dispatches sub-requests to matched producers.
    """
    match_payload = MatchingRequest(
        product_name=bulk_in.product_name,
        required_quantity=bulk_in.required_quantity,
        unit=bulk_in.unit,
        location=bulk_in.delivery_location
    )
    match_result = match_sellers(match_payload)

    now = datetime.now(timezone.utc)
    bulk_doc = {
        "buyer_id": user["uid"],
        "buyer_name": user.get("name", "Bulk Buyer"),
        "buyer_email": user.get("email", ""),
        "product_name": bulk_in.product_name.strip(),
        "required_quantity": bulk_in.required_quantity,
        "unit": bulk_in.unit.strip(),
        "delivery_location": bulk_in.delivery_location or "",
        "target_price": bulk_in.target_price,
        "needed_by": bulk_in.needed_by or "",
        "notes": bulk_in.notes or "",
        "status": "open",
        "matched_quantity": match_result["matched_quantity"],
        "is_fulfilled": match_result["is_fulfilled"],
        "total_estimated_cost": match_result["estimated_total_cost"],
        "allocations": match_result["matches"],
        "offers": [],
        "dispatched_request_ids": [],
        "created_at": now,
        "updated_at": now
    }

    # Atomic stock reservation to prevent multiple bulk orders from over-allocating inventory
    dispatched_ids = []
    reserved_matches = []
    if bulk_in.auto_match_and_dispatch and match_result["matches"]:
        for m in match_result["matches"]:
            listing_obj_id = parse_object_id(m["listing_id"], "Listing")
            qty_to_reserve = float(m["available_quantity"])

            reserve_res = listings_collection.update_one(
                {
                    "_id": listing_obj_id,
                    "quantity": {"$gte": qty_to_reserve},
                    "status": "active",
                    "is_active": True
                },
                {
                    "$inc": {"quantity": -qty_to_reserve},
                    "$set": {"updated_at": now}
                }
            )

            if reserve_res.modified_count > 0:
                updated_l = listings_collection.find_one({"_id": listing_obj_id})
                if updated_l and updated_l.get("quantity", 0) <= 0:
                    listings_collection.update_one({"_id": listing_obj_id}, {"$set": {"status": "out_of_stock"}})

                sub_req = {
                    "listing_id": m["listing_id"],
                    "seller_id": m["seller_id"],
                    "seller_name": m["seller_name"],
                    "product_name": bulk_in.product_name.strip(),
                    "buyer_id": user["uid"],
                    "buyer_name": user.get("name", "Bulk Buyer"),
                    "buyer_email": user.get("email", ""),
                    "delivery_location": bulk_in.delivery_location or "",
                    "contact": user.get("email", ""),
                    "required_quantity": qty_to_reserve,
                    "unit": m["unit"],
                    "price_per_unit": m["price"],
                    "total_estimated_price": m["subtotal"],
                    "message": f"Bulk Procurement Pool Order: {bulk_in.product_name} ({bulk_in.notes or 'No special instructions'})",
                    "status": "pending",
                    "is_paid": False,
                    "is_bulk_part": True,
                    "stock_reserved": True,
                    "created_at": now,
                    "updated_at": now
                }
                sub_res = requests_collection.insert_one(sub_req)
                dispatched_ids.append(str(sub_res.inserted_id))
                reserved_matches.append(m)

                create_in_app_notification(
                    user_id=m["seller_id"],
                    title="Bulk Pool Order Request!",
                    message=f"You have been allocated {qty_to_reserve} {m['unit']} in a pooled wholesale order for {bulk_in.product_name}.",
                    notif_type="bulk_order",
                    link="/dashboard"
                )
            else:
                logger.warning(f"Could not reserve stock for listing {m['listing_id']} due to concurrent allocation.")

    bulk_doc["dispatched_request_ids"] = dispatched_ids
    bulk_doc["allocations"] = reserved_matches if bulk_in.auto_match_and_dispatch else match_result["matches"]
    res = bulk_requests_collection.insert_one(bulk_doc)
    bulk_id = str(res.inserted_id)

    create_in_app_notification(
        user_id=user["uid"],
        title="Bulk Request Published",
        message=f"Bulk requirement for {bulk_in.required_quantity} {bulk_in.unit} of {bulk_in.product_name} is active.",
        notif_type="bulk_order",
        link=f"/bulk-requests"
    )

    return {
        "message": "Bulk order request created successfully!",
        "bulk_request_id": bulk_id,
        "matched_quantity": match_result["matched_quantity"],
        "is_fulfilled": match_result["is_fulfilled"],
        "dispatched_count": len(dispatched_ids),
        "status": "open"
    }

@app.get("/bulk-requests/", tags=["Bulk Requests"])
def get_bulk_requests(
    product_name: Optional[str] = None,
    status_filter: Optional[str] = Query("open", description="open, fulfilled, cancelled, all"),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    query: Dict[str, Any] = {}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()
    if product_name:
        query["product_name"] = {"$regex": re.escape(product_name.strip()), "$options": "i"}

    bulk_reqs = list(bulk_requests_collection.find(query).sort("created_at", DESCENDING).limit(limit))
    viewer_uid = current_user.get("uid") if current_user else None
    return [sanitize_bulk_request(b, viewer_uid) for b in bulk_reqs]

@app.get("/bulk-requests/buyer/me", tags=["Bulk Requests"])
def get_my_bulk_requests(user: dict = Depends(verify_firebase_token)):
    bulk_reqs = list(bulk_requests_collection.find({"buyer_id": user["uid"]}).sort("created_at", DESCENDING))
    return [sanitize_bulk_request(b, user["uid"]) for b in bulk_reqs]

@app.get("/bulk-requests/{bulk_id}", tags=["Bulk Requests"])
def get_bulk_request_by_id(
    bulk_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    obj_id = parse_object_id(bulk_id, "Bulk Request")
    bulk = bulk_requests_collection.find_one({"_id": obj_id})
    if not bulk:
        raise HTTPException(status_code=404, detail="Bulk request not found")
    viewer_uid = current_user.get("uid") if current_user else None
    return sanitize_bulk_request(bulk, viewer_uid)

@app.post("/bulk-requests/{bulk_id}/offers", tags=["Bulk Requests"])
def submit_bulk_offer(
    bulk_id: str,
    offer: BulkRequestOffer,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(bulk_id, "Bulk Request")
    bulk = bulk_requests_collection.find_one({"_id": obj_id})
    if not bulk:
        raise HTTPException(status_code=404, detail="Bulk request not found")

    if bulk.get("status") != "open":
        raise HTTPException(status_code=400, detail="Cannot bid on closed or completed bulk orders")

    offer_doc = {
        "offer_id": uuid.uuid4().hex[:10],
        "seller_id": user["uid"],
        "seller_name": user.get("name", "Rural Producer"),
        "offered_quantity": offer.offered_quantity,
        "unit_price": offer.unit_price,
        "total_offer_cost": round(offer.offered_quantity * offer.unit_price, 2),
        "notes": offer.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }

    bulk_requests_collection.update_one(
        {"_id": obj_id},
        {
            "$push": {"offers": offer_doc},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    create_in_app_notification(
        user_id=bulk["buyer_id"],
        title="New Bulk Supply Offer!",
        message=f"{offer_doc['seller_name']} offered {offer.offered_quantity} {bulk.get('unit')} at ₹{offer.unit_price}/{bulk.get('unit')} for your bulk order.",
        notif_type="bulk_offer",
        link=f"/bulk-requests/{bulk_id}"
    )

    return {
        "message": "Offer submitted successfully!",
        "offer_id": offer_doc["offer_id"],
        "status": "pending"
    }

@app.patch("/bulk-requests/{bulk_id}/cancel", tags=["Bulk Requests"])
def cancel_bulk_request(
    bulk_id: str,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(bulk_id, "Bulk Request")
    bulk = bulk_requests_collection.find_one({"_id": obj_id})
    if not bulk:
        raise HTTPException(status_code=404, detail="Bulk request not found")

    if bulk.get("buyer_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own bulk requests")

    now = datetime.now(timezone.utc)
    # Roll back reserved stock for any pending dispatched sub-requests
    for req_id in bulk.get("dispatched_request_ids", []):
        sub_req = requests_collection.find_one({"_id": ObjectId(req_id), "status": "pending"})
        if sub_req and sub_req.get("stock_reserved"):
            listings_collection.update_one(
                {"_id": ObjectId(sub_req["listing_id"])},
                {
                    "$inc": {"quantity": sub_req["required_quantity"]},
                    "$set": {"status": "active", "updated_at": now}
                }
            )
            requests_collection.update_one(
                {"_id": sub_req["_id"]},
                {"$set": {"status": "cancelled", "stock_reserved": False, "updated_at": now}}
            )

    bulk_requests_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )

    return {"message": "Bulk request cancelled successfully and reserved inventory released.", "status": "cancelled"}


# =========================================================
# PHASE 8: Real Payments & Transaction Management
# =========================================================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_ruralrise_default")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "ruralrise_secret_key_mock_secure_2026")

def generate_razorpay_signature(order_id: str, payment_id: str) -> str:
    """Generate cryptographic HMAC-SHA256 signature matching payment gateway standard."""
    msg = f"{order_id}|{payment_id}"
    return hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify payment signature strictly to prevent unauthorized payment mark."""
    expected = generate_razorpay_signature(order_id, payment_id)
    return hmac.compare_digest(expected, signature)


@app.post("/payments/create-order", tags=["Payments"])
def create_payment_order(
    payment: PaymentCreate,
    user: dict = Depends(verify_firebase_token)
):
    """
    Create a payment intent / order.
    Requires a valid linked request_id or bulk_request_id.
    Strictly verifies buyer ownership and authoritatively calculates amount from database.
    """
    if not payment.request_id and not payment.bulk_request_id:
        raise HTTPException(
            status_code=400,
            detail="Payment must be linked to a valid request_id or bulk_request_id."
        )

    seller_id = ""
    computed_amount = 0.0

    if payment.request_id:
        req_obj = parse_object_id(payment.request_id, "Request")
        req_doc = requests_collection.find_one({"_id": req_obj})
        if not req_doc:
            raise HTTPException(status_code=404, detail="Referenced order request not found.")

        # Buyer ownership check
        if req_doc.get("buyer_id") != user["uid"]:
            raise HTTPException(status_code=403, detail="You can only initiate payment for your own order requests.")

        # Order status check
        if req_doc.get("status") not in ["accepted", "pending"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot pay for request with status '{req_doc.get('status')}'. Must be accepted or pending."
            )

        # Duplicate check
        if req_doc.get("is_paid"):
            raise HTTPException(status_code=400, detail="This order request has already been paid.")

        computed_amount = round(float(req_doc.get("total_estimated_price", 0)), 2)
        if computed_amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid order total amount.")

        # If client passed an amount, confirm it matches authoritative amount
        if payment.amount is not None and abs(payment.amount - computed_amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Submitted payment amount (₹{payment.amount}) does not match authoritative order total (₹{computed_amount})."
            )

        seller_id = req_doc.get("seller_id", "")

    elif payment.bulk_request_id:
        bulk_obj = parse_object_id(payment.bulk_request_id, "Bulk Request")
        bulk_doc = bulk_requests_collection.find_one({"_id": bulk_obj})
        if not bulk_doc:
            raise HTTPException(status_code=404, detail="Referenced bulk request not found.")

        if bulk_doc.get("buyer_id") != user["uid"]:
            raise HTTPException(status_code=403, detail="You can only initiate payment for your own bulk requests.")

        if bulk_doc.get("status") in ["cancelled", "closed"]:
            raise HTTPException(status_code=400, detail="Cannot pay for a cancelled or closed bulk request.")

        computed_amount = round(float(bulk_doc.get("total_estimated_cost", 0)), 2)
        if computed_amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid bulk order total amount.")

        if payment.amount is not None and abs(payment.amount - computed_amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Submitted payment amount (₹{payment.amount}) does not match authoritative bulk total (₹{computed_amount})."
            )

    txn_id = f"txn_{uuid.uuid4().hex[:14]}"
    gateway_order_id = f"order_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    payment_doc = {
        "transaction_id": txn_id,
        "gateway_order_id": gateway_order_id,
        "user_id": user["uid"],
        "buyer_id": user["uid"],
        "seller_id": seller_id,
        "request_id": payment.request_id,
        "bulk_request_id": payment.bulk_request_id,
        "amount": computed_amount,
        "currency": payment.currency.upper(),
        "payment_method": payment.payment_method,
        "status": "initiated",
        "notes": payment.notes,
        "created_at": now,
        "updated_at": now
    }

    payments_collection.insert_one(payment_doc)

    return {
        "message": "Payment order initiated successfully",
        "transaction_id": txn_id,
        "gateway_order_id": gateway_order_id,
        "amount": computed_amount,
        "currency": payment_doc["currency"],
        "status": "initiated"
    }

@app.post("/payments/verify", tags=["Payments"])
def verify_payment(
    verify_in: PaymentVerify,
    user: dict = Depends(verify_firebase_token)
):
    """
    Verify payment completion via cryptographic HMAC-SHA256 signature verification.
    Updates transaction status, marks linked request as paid, and notifies buyer and seller.
    """
    payment = payments_collection.find_one({"transaction_id": verify_in.transaction_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction record not found")

    if payment.get("user_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Unauthorized transaction access")

    if payment.get("status") == "success":
        return {
            "message": "Payment has already been successfully verified",
            "transaction_id": verify_in.transaction_id,
            "status": "success"
        }

    gateway_order_id = payment.get("gateway_order_id", verify_in.gateway_order_id)

    # Real cryptographic HMAC-SHA256 signature check
    is_valid_sig = verify_razorpay_signature(
        gateway_order_id,
        verify_in.gateway_payment_id,
        verify_in.signature
    )
    if not is_valid_sig:
        raise HTTPException(
            status_code=400,
            detail="Payment signature verification failed. Invalid or fraudulent payment signature."
        )

    now = datetime.now(timezone.utc)
    payments_collection.update_one(
        {"transaction_id": verify_in.transaction_id},
        {
            "$set": {
                "status": "success",
                "gateway_payment_id": verify_in.gateway_payment_id,
                "verified_at": now,
                "updated_at": now
            }
        }
    )

    # Mark linked order request as paid
    if payment.get("request_id"):
        req_obj = parse_object_id(payment["request_id"], "Request")
        requests_collection.update_one(
            {"_id": req_obj},
            {"$set": {"is_paid": True, "payment_id": verify_in.transaction_id, "updated_at": now}}
        )

        req_doc = requests_collection.find_one({"_id": req_obj})
        if req_doc and req_doc.get("seller_id"):
            create_in_app_notification(
                user_id=req_doc["seller_id"],
                title="Payment Received! 💰",
                message=f"Payment of ₹{payment['amount']} received for order of {req_doc.get('product_name')}.",
                notif_type="payment",
                link="/dashboard"
            )

    create_in_app_notification(
        user_id=user["uid"],
        title="Payment Successful! 🎉",
        message=f"Your payment of ₹{payment['amount']} (Ref: {verify_in.transaction_id}) has been confirmed.",
        notif_type="payment",
        link="/dashboard"
    )

    return {
        "message": "Payment verified and confirmed successfully!",
        "transaction_id": verify_in.transaction_id,
        "amount": payment["amount"],
        "status": "success"
    }

@app.get("/payments/my/transactions", tags=["Payments"])
def get_my_transactions(user: dict = Depends(verify_firebase_token)):
    txns = list(
        payments_collection.find({
            "$or": [{"user_id": user["uid"]}, {"seller_id": user["uid"]}]
        }).sort("created_at", DESCENDING)
    )
    return [format_doc_id(t) for t in txns]

@app.get("/payments/{transaction_id}", tags=["Payments"])
def get_payment_details(transaction_id: str, user: dict = Depends(verify_firebase_token)):
    payment = payments_collection.find_one({"transaction_id": transaction_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.get("user_id") != user["uid"] and payment.get("seller_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view this transaction")

    return format_doc_id(payment)

@app.post("/payments/{transaction_id}/refund", tags=["Payments"])
def refund_payment(transaction_id: str, user: dict = Depends(verify_firebase_token)):
    payment = payments_collection.find_one({"transaction_id": transaction_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.get("user_id") != user["uid"] and payment.get("seller_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Unauthorized to refund this transaction")

    if payment.get("status") != "success":
        raise HTTPException(status_code=400, detail="Only successful payments can be refunded")

    now = datetime.now(timezone.utc)
    refund_id = f"rfnd_{uuid.uuid4().hex[:14]}"

    payments_collection.update_one(
        {"transaction_id": transaction_id},
        {
            "$set": {
                "status": "refunded",
                "refund_id": refund_id,
                "refunded_at": now,
                "refund_amount": payment.get("amount", 0.0),
                "updated_at": now
            }
        }
    )

    # Revert paid status on linked order request
    if payment.get("request_id"):
        requests_collection.update_one(
            {"_id": ObjectId(payment["request_id"])},
            {"$set": {"is_paid": False, "refund_id": refund_id, "updated_at": now}}
        )

    return {
        "message": "Refund processed successfully",
        "transaction_id": transaction_id,
        "refund_id": refund_id,
        "refund_amount": payment.get("amount", 0.0),
        "status": "refunded"
    }


# =========================================================
# PHASE 9: Skilled Worker & Artisan Functionality
# =========================================================

@app.post("/workers/profile", tags=["Skilled Workers & Artisans"])
def save_worker_profile(
    profile: WorkerProfileCreate,
    user: dict = Depends(verify_firebase_token)
):
    """
    Create or update skilled worker / artisan profile.
    Enables rural craftspeople, tractor operators, harvesters, and artisans to offer skilled services.
    """
    doc = profile.model_dump()
    doc["user_id"] = user["uid"]
    doc["rating"] = 5.0
    doc["total_jobs_completed"] = 0
    doc["updated_at"] = datetime.now(timezone.utc)

    worker_profiles_collection.update_one(
        {"user_id": user["uid"]},
        {
            "$set": doc,
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)}
        },
        upsert=True
    )

    # Standardize user role to worker if not set
    users_collection.update_one(
        {"uid": user["uid"]},
        {"$set": {"role": "worker", "updated_at": datetime.now(timezone.utc)}}
    )

    create_in_app_notification(
        user_id=user["uid"],
        title="Worker Profile Active",
        message=f"Your skilled worker profile for '{profile.worker_name}' is now active.",
        notif_type="worker",
        link="/dashboard"
    )

    return {"message": "Worker profile saved successfully!", "worker_name": profile.worker_name}

@app.get("/workers/profile/me", tags=["Skilled Workers & Artisans"])
def get_my_worker_profile(user: dict = Depends(verify_firebase_token)):
    profile = worker_profiles_collection.find_one({"user_id": user["uid"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found. Please create one.")
    return format_doc_id(profile)

@app.get("/workers/", tags=["Skilled Workers & Artisans"])
def search_workers(
    skill: Optional[str] = None,
    state: Optional[str] = None,
    village: Optional[str] = None,
    available_only: bool = True,
    limit: int = Query(50, ge=1, le=100)
):
    query: Dict[str, Any] = {}
    if available_only:
        query["is_available"] = True
    if skill and skill.strip():
        query["skills"] = {"$regex": re.escape(skill.strip()), "$options": "i"}
    if state and state.strip():
        query["state"] = {"$regex": f"^{re.escape(state.strip())}$", "$options": "i"}
    if village and village.strip():
        query["village"] = {"$regex": f"^{re.escape(village.strip())}$", "$options": "i"}

    workers = list(worker_profiles_collection.find(query).limit(limit))
    return [format_doc_id(w) for w in workers]

@app.get("/workers/{worker_id}", tags=["Skilled Workers & Artisans"])
def get_worker_by_id(worker_id: str):
    obj_id = parse_object_id(worker_id, "Worker")
    worker = worker_profiles_collection.find_one({"_id": obj_id})
    if not worker:
        # Also try matching user_id
        worker = worker_profiles_collection.find_one({"user_id": worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return format_doc_id(worker)

@app.post("/workers/services", tags=["Skilled Workers & Artisans"])
def create_worker_service(
    service: WorkerServiceCreate,
    user: dict = Depends(verify_firebase_token)
):
    doc = service.model_dump()
    doc["worker_id"] = user["uid"]
    doc["worker_name"] = user.get("name", "Rural Artisan")
    doc["is_active"] = True
    doc["created_at"] = datetime.now(timezone.utc)

    res = worker_services_collection.insert_one(doc)
    return {"message": "Service published successfully!", "service_id": str(res.inserted_id)}

@app.get("/workers/services/", tags=["Skilled Workers & Artisans"])
def get_worker_services(category: Optional[str] = None, limit: int = Query(50, ge=1, le=100)):
    query = {"is_active": True}
    if category:
        query["category"] = category
    services = list(worker_services_collection.find(query).limit(limit))
    return [format_doc_id(s) for s in services]

@app.post("/workers/book", tags=["Skilled Workers & Artisans"])
def book_worker(
    booking: WorkerBookingCreate,
    user: dict = Depends(verify_firebase_token)
):
    now = datetime.now(timezone.utc)
    booking_doc = {
        "client_id": user["uid"],
        "client_name": user.get("name", "Client"),
        "client_email": user.get("email", ""),
        "worker_id": booking.worker_id,
        "service_id": booking.service_id,
        "job_description": booking.job_description,
        "start_date": booking.start_date,
        "duration_days": booking.duration_days,
        "location": booking.location,
        "compensation": booking.offered_compensation,
        "status": "pending",
        "created_at": now,
        "updated_at": now
    }

    res = worker_bookings_collection.insert_one(booking_doc)

    create_in_app_notification(
        user_id=booking.worker_id,
        title="New Work Booking Request!",
        message=f"{booking_doc['client_name']} requested your service for {booking.duration_days} day(s) at {booking.location}.",
        notif_type="work_booking",
        link="/dashboard"
    )

    return {
        "message": "Worker booking request submitted successfully!",
        "booking_id": str(res.inserted_id),
        "status": "pending"
    }

@app.get("/workers/bookings/me", tags=["Skilled Workers & Artisans"])
def get_my_worker_bookings(user: dict = Depends(verify_firebase_token)):
    bookings = list(
        worker_bookings_collection.find({
            "$or": [{"client_id": user["uid"]}, {"worker_id": user["uid"]}]
        }).sort("created_at", DESCENDING)
    )
    return [format_doc_id(b) for b in bookings]

@app.patch("/workers/bookings/{booking_id}", tags=["Skilled Workers & Artisans"])
def update_worker_booking_status(
    booking_id: str,
    update_in: WorkerBookingStatusUpdate,
    user: dict = Depends(verify_firebase_token)
):
    """
    Update worker booking status with strict state-transition permissions:
    - Worker can: accept/decline pending bookings, start in_progress, and complete bookings.
    - Client can: cancel pending/accepted bookings, or confirm completion of in-progress bookings.
    """
    obj_id = parse_object_id(booking_id, "Booking")
    booking = worker_bookings_collection.find_one({"_id": obj_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    uid = user["uid"]
    is_worker = (booking.get("worker_id") == uid)
    is_client = (booking.get("client_id") == uid)

    if not is_worker and not is_client:
        raise HTTPException(status_code=403, detail="Unauthorized: You are neither the worker nor the client for this booking.")

    current_status = booking.get("status", "pending")
    target_status = update_in.status

    if is_worker:
        worker_allowed = {
            "pending": ["accepted", "declined"],
            "accepted": ["in_progress", "completed"],
            "in_progress": ["completed"]
        }
        if target_status not in worker_allowed.get(current_status, []):
            raise HTTPException(
                status_code=400,
                detail=f"Worker is not permitted to transition booking from '{current_status}' to '{target_status}'. Permitted: {worker_allowed.get(current_status, [])}"
            )
    elif is_client:
        client_allowed = {
            "pending": ["cancelled"],
            "accepted": ["cancelled"],
            "in_progress": ["completed"]
        }
        if target_status not in client_allowed.get(current_status, []):
            raise HTTPException(
                status_code=400,
                detail=f"Client is not permitted to transition booking from '{current_status}' to '{target_status}'. Permitted: {client_allowed.get(current_status, [])}"
            )

    now = datetime.now(timezone.utc)
    res = worker_bookings_collection.update_one(
        {"_id": obj_id, "status": current_status},
        {
            "$set": {
                "status": target_status,
                "notes": update_in.notes or "",
                "updated_at": now
            }
        }
    )

    if res.modified_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Booking status changed concurrently. Please reload."
        )

    target_notify_uid = booking["client_id"] if is_worker else booking["worker_id"]
    create_in_app_notification(
        user_id=target_notify_uid,
        title=f"Work Booking {target_status.capitalize()}",
        message=f"The booking request has been updated to '{target_status}'.",
        notif_type="work_booking",
        link="/dashboard"
    )

    return {"message": f"Booking updated to '{target_status}'", "status": target_status}


# =========================================================
# PHASE 10: In-App Notifications
# =========================================================

@app.get("/notifications/me", tags=["Notifications"])
def get_my_notifications(
    limit: int = Query(30, ge=1, le=100),
    user: dict = Depends(verify_firebase_token)
):
    notifs = list(
        notifications_collection.find({"user_id": user["uid"]})
        .sort("created_at", DESCENDING)
        .limit(limit)
    )
    return [format_doc_id(n) for n in notifs]

@app.get("/notifications/unread-count", tags=["Notifications"])
def get_unread_notification_count(user: dict = Depends(verify_firebase_token)):
    count = notifications_collection.count_documents({
        "user_id": user["uid"],
        "is_read": False
    })
    return {"unread_count": count}

@app.patch("/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(
    notification_id: str,
    user: dict = Depends(verify_firebase_token)
):
    obj_id = parse_object_id(notification_id, "Notification")
    result = notifications_collection.update_one(
        {"_id": obj_id, "user_id": user["uid"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@app.post("/notifications/read-all", tags=["Notifications"])
def mark_all_notifications_read(user: dict = Depends(verify_firebase_token)):
    notifications_collection.update_many(
        {"user_id": user["uid"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}


# =========================================================
# PHASE 11: Image & File Management (Deep Content & MIME Validation)
# =========================================================

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/pjpeg", "image/x-png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_image_magic_bytes(content: bytes, ext: str) -> bool:
    """Validate true file signatures to prevent executable/script disguise."""
    if len(content) < 12:
        return False
    if ext in {".jpg", ".jpeg"}:
        return content.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".webp":
        return content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False

@app.post("/upload/image", tags=["File Management"])
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(verify_firebase_token)
):
    # 1. Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, PNG, WEBP"
        )

    # 2. Validate MIME type
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME content type '{file.content_type}'. Must be a valid image."
        )

    # 3. Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 5 MB."
        )

    # 4. Strict Magic Number / Signature Verification
    if not validate_image_magic_bytes(content, ext):
        raise HTTPException(
            status_code=400,
            detail="File content does not match a valid image format. Security check failed."
        )

    # 5. Generate secure random filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(dest_path, "wb") as f:
        f.write(content)

    public_url = f"/uploads/{unique_filename}"
    return {
        "message": "Image uploaded successfully!",
        "url": public_url,
        "filename": unique_filename
    }


# =========================================================
# PHASE 12: Template & Advisory Assistance (Curated Rural Copilot)
# =========================================================

@app.post("/ai/generate-description", tags=["Template & Advisory Assistance"])
def ai_generate_description(request: AIDescriptionRequest):
    """
    Curated description generator for rural producers and MSMEs.
    Uses domain-specific templates for agricultural and artisan categories.
    Can be connected to live cloud LLM inference in production.
    """
    product = request.product_name.strip()
    category = request.category.strip()
    materials = (request.materials or "natural, authentic local ingredients").strip()

    descriptions = {
        "Agriculture": f"Hand-harvested {product} grown using regenerative, soil-friendly traditional practices. Cleaned, graded, and packed at the farm-gate to preserve natural nutrients and fresh aroma.",
        "Handicrafts": f"Authentically crafted {product} made with {materials}. Hand-formed by experienced rural artisans using generational techniques, celebrating rich cultural craftsmanship.",
        "Food & Beverages": f"Traditional, unadulterated {product} prepared in small batches from {materials}. Free of chemical preservatives, delivering authentic regional taste and wholesome nourishment.",
        "Grains & Pulses": f"Farm-fresh {product} harvested at peak maturity. Unpolished and sun-dried to lock in essential dietary fiber, natural proteins, and earthy richness.",
        "Dairy Products": f"Pure and unadulterated {product} sourced directly from village dairy co-operatives. Rich in nutritional goodness and prepared following strict hygienic standards."
    }

    generated_text = descriptions.get(
        category,
        f"Premium quality {product} produced with pride by rural artisans and growers. Made with {materials}, offering authentic quality directly from the producer without middlemen."
    )

    highlight = "100% Direct-from-Farm/Artisan • Zero Middleman Markup • Verified Rural MSME"
    guidance = f"Fair market rates for {category.lower()} items typically range from ₹30 to ₹450 depending on packaging, purity, and volume."

    return {
        "product_name": product,
        "category": category,
        "generated_description": generated_text,
        "highlight": highlight,
        "suggested_price_guidance": guidance,
        "engine": "RuralRise Curated Rule-Based & Template Engine (Prototype)",
        "is_template": True,
        "notice": "Curated agricultural & craft template guidance for rural producers. Live LLM cloud inference can be enabled in production."
    }

@app.post("/ai/advisory", tags=["Template & Advisory Assistance"])
def ai_market_advisory(request: AIAdvisoryRequest):
    """
    Curated agricultural & handicraft market advisory and government scheme lookup.
    """
    q = request.query.lower()

    advisory_text = (
        "RuralRise Market Intelligence recommends aligning your farm-gate pricing with regional mandi benchmarks "
        "and pooling bulk inventory to command premium wholesale margins without intermediary commissions."
    )

    schemes = [
        {
            "name": "PMFME (PM Formalisation of Micro food processing Enterprises)",
            "subsidy": "Up to 35% capital subsidy (max ₹10 Lakhs) for rural micro-enterprises and agri-processors.",
            "link": "https://mofpi.gov.in/pmfme"
        },
        {
            "name": "PMMY — Pradhan Mantri Mudra Yojana (Shishu & Kishore)",
            "subsidy": "Collateral-free business loans from ₹50,000 up to ₹5,00,000 for artisans and village entrepreneurs.",
            "link": "https://www.mudra.org.in"
        },
        {
            "name": "ODOP (One District One Product) Scheme",
            "subsidy": "Marketing, branding, and export logistics support for unique regional crafts and crops.",
            "link": "https://www.odop.org.in"
        }
    ]

    if "price" in q or "rate" in q:
        advisory_text = (
            "Current wholesale prices indicate strong demand for verified organic produce and handlooms. "
            "Setting your price 5-10% below city retail will attract bulk commercial buyers while netting you 20-30% "
            "more than traditional middleman farm-gate rates."
        )
    elif "scheme" in q or "subsidy" in q or "loan" in q:
        advisory_text = (
            "You are eligible for multiple central and state government MSME development programs. "
            "The PMFME scheme provides seed capital of ₹40,000 per SHG member and up to 35% credit-linked capital subsidy."
        )

    return {
        "query": request.query,
        "advisory": advisory_text,
        "applicable_schemes": schemes,
        "engine": "RuralRise Curated Rule-Based & Template Engine (Prototype)",
        "is_template": True,
        "notice": "Government MSME and agri-mandi guidelines provided from verified rural welfare programs."
    }


# ---------------------------------------------------------
# Run with Uvicorn (Entrypoint)
# ---------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
