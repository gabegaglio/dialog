import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.db import settings

class DexcomService:
    def __init__(self):
        self.sandbox_base_url = "https://sandbox-api.dexcom.com"
        self.production_base_url = "https://api.dexcom.com"
        self.base_url = self.sandbox_base_url  # Using sandbox for development
        
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """Generate the OAuth authorization URL for Dexcom login"""
        params = {
            'client_id': settings.DEXCOM_CLIENT_ID,
            'redirect_uri': settings.DEXCOM_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'offline_access'
        }
        if state:
            params['state'] = state
            
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{self.base_url}/v2/oauth2/login?{query_string}"
    
    async def exchange_code_for_tokens(self, authorization_code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v2/oauth2/token",
                data={
                    'grant_type': 'authorization_code',
                    'code': authorization_code,
                    'redirect_uri': settings.DEXCOM_REDIRECT_URI,
                    'client_id': settings.DEXCOM_CLIENT_ID,
                    'client_secret': settings.DEXCOM_CLIENT_SECRET
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v2/oauth2/token",
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': settings.DEXCOM_CLIENT_ID,
                    'client_secret': settings.DEXCOM_CLIENT_SECRET
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_glucose_data(self, access_token: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Fetch glucose data (EGVs) from Dexcom API"""
        if not start_date:
            start_date = (datetime.now() - timedelta(hours=24)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/users/self/egvs",
                params={
                    'startDate': start_date,
                    'endDate': end_date
                },
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Dexcom API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/users/self",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()

dexcom_service = DexcomService()
