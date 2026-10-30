import os
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import FastAPI
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

app = FastAPI(
    title="RuralRise API",
    description="Backend API for the RuralRise marketplace",
    version="1.0.0"
)


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