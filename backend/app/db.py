import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from datetime import datetime, timedelta
from typing import Optional

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "diabetes_mvp"

    DEXCOM_CLIENT_ID: str = ""
    DEXCOM_CLIENT_SECRET: str = ""
    DEXCOM_REDIRECT_URI: str = ""

    OPENAI_API_KEY: str = ""

settings = Settings(_env_file=os.getenv('ENV_FILE', '.env'))

# Initialize MongoDB client with error handling
mongo_available = False
client = None
db = None
users_collection = None
tokens_collection = None
glucose_collection = None

# In-memory fallback storage for when MongoDB is not available
fallback_tokens = {}

def init_mongodb():
    """Initialize MongoDB connection if available"""
    global mongo_available, client, db, users_collection, tokens_collection, glucose_collection
    
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.DB_NAME]
        # Test connection with short timeout
        client.admin.command('ping')
        mongo_available = True
        users_collection = db.users
        tokens_collection = db.tokens
        glucose_collection = db.glucose
        print("MongoDB connection successful")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        print("Running in fallback mode without database persistence")
        mongo_available = False
        client = None
        db = None
        users_collection = None
        tokens_collection = None
        glucose_collection = None

# Initialize MongoDB (will fail gracefully if not available)
init_mongodb()

async def get_user_tokens(user_id: str):
    """Get user's Dexcom tokens from database or fallback storage"""
    if mongo_available and tokens_collection is not None:
        try:
            return await tokens_collection.find_one({"user_id": user_id})
        except Exception as e:
            print(f"Database error: {e}")
            return fallback_tokens.get(user_id)
    else:
        return fallback_tokens.get(user_id)

async def save_user_tokens(user_id: str, access_token: str, refresh_token: str, expires_in: int):
    """Save or update user's Dexcom tokens"""
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    token_data = {
        "user_id": user_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "updated_at": datetime.utcnow()
    }
    
    if mongo_available and tokens_collection is not None:
        try:
            await tokens_collection.update_one(
                {"user_id": user_id},
                {"$set": token_data},
                upsert=True
            )
        except Exception as e:
            print(f"Database error: {e}")
            # Fallback to in-memory storage
            fallback_tokens[user_id] = token_data
    else:
        # Use in-memory storage
        fallback_tokens[user_id] = token_data

async def is_token_valid(user_id: str) -> bool:
    """Check if user's access token is still valid"""
    token_doc = await get_user_tokens(user_id)
    if not token_doc:
        return False
    
    return token_doc.get("expires_at", datetime.min) > datetime.utcnow()

async def get_valid_access_token(user_id: str) -> Optional[str]:
    """Get a valid access token for the user, refreshing if necessary"""
    token_doc = await get_user_tokens(user_id)
    if not token_doc:
        return None
    
    if await is_token_valid(user_id):
        return token_doc["access_token"]
    
    # Token expired, need to refresh
    return None  # Will be handled by the service layer

async def delete_user_tokens(user_id: str) -> bool:
    """Delete user's tokens from database or fallback storage"""
    if mongo_available and tokens_collection is not None:
        try:
            result = await tokens_collection.delete_one({"user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Database error: {e}")
            # Fallback to in-memory storage
            if user_id in fallback_tokens:
                del fallback_tokens[user_id]
                return True
            return False
    else:
        # Use in-memory storage
        if user_id in fallback_tokens:
            del fallback_tokens[user_id]
            return True
        return False
