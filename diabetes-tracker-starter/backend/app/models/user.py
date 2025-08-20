from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class UserToken(BaseModel):
    """Model for storing user's Dexcom OAuth tokens"""
    user_id: str = Field(..., description="Unique user identifier")
    access_token: str = Field(..., description="Dexcom access token")
    refresh_token: str = Field(..., description="Dexcom refresh token")
    expires_at: datetime = Field(..., description="When the access token expires")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    """Model for storing user profile information"""
    user_id: str = Field(..., description="Unique user identifier")
    dexcom_user_id: Optional[str] = Field(None, description="Dexcom user ID")
    email: Optional[str] = Field(None, description="User email")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
