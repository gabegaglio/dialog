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
        print(f"=== Token Exchange Debug ===")
        print(f"Authorization code: {authorization_code[:20]}...")
        print(f"Redirect URI: {settings.DEXCOM_REDIRECT_URI}")
        print(f"Client ID: {settings.DEXCOM_CLIENT_ID}")
        print(f"Client Secret: {settings.DEXCOM_CLIENT_SECRET[:10]}...")
        
        # Prepare form data as x-www-form-urlencoded
        form_data = {
            'grant_type': 'authorization_code',
            'code': authorization_code,
            'redirect_uri': settings.DEXCOM_REDIRECT_URI,
            'client_id': settings.DEXCOM_CLIENT_ID,
            'client_secret': settings.DEXCOM_CLIENT_SECRET
        }
        
        # Convert to URL-encoded form string using proper encoding
        from urllib.parse import urlencode
        form_string = urlencode(form_data)
        print(f"Form data: {form_data}")
        print(f"Token endpoint: {self.base_url}/v2/oauth2/token")
        
        try:
            async with httpx.AsyncClient() as client:
                print(f"🔄 Making POST request to Dexcom token endpoint...")
                response = await client.post(
                    f"{self.base_url}/v2/oauth2/token",
                    content=form_string,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                print(f"✅ Response received - Status: {response.status_code}")
                print(f"Response headers: {dict(response.headers)}")
                
                if response.status_code != 200:
                    print(f"❌ Error response: {response.text}")
                    response.raise_for_status()
                
                token_data = response.json()
                print(f"✅ Token exchange successful - Keys: {list(token_data.keys())}")
                return token_data
                
        except Exception as e:
            print(f"❌ Token exchange failed: {type(e).__name__}: {str(e)}")
            raise
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        print(f"🔄 Refreshing access token using refresh token...")
        
        # Prepare form data as x-www-form-urlencoded
        form_data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': settings.DEXCOM_CLIENT_ID,
            'client_secret': settings.DEXCOM_CLIENT_SECRET
        }
        
        # Convert to URL-encoded form string using proper encoding
        from urllib.parse import urlencode
        form_string = urlencode(form_data)
        
        print(f"Refresh token endpoint: {self.base_url}/v2/oauth2/token")
        print(f"Form data: {form_data}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/oauth2/token",
                    content=form_string,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                print(f"✅ Refresh response received - Status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ Refresh error response: {response.text}")
                    response.raise_for_status()
                
                token_data = response.json()
                print(f"✅ Token refresh successful - Keys: {list(token_data.keys())}")
                return token_data
                
        except Exception as e:
            print(f"❌ Token refresh failed: {type(e).__name__}: {str(e)}")
            raise
    
    async def get_data_range(self, access_token: str) -> Dict[str, Any]:
        """Get user's data range from Dexcom API V2 - to check available data"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/users/self/dataRange",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()



    async def get_glucose_data(self, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Fetch glucose data (EGVs) from Dexcom API V2 - automatically handles token refresh"""
        # Get a valid access token (refreshing if needed)
        access_token = await self.get_valid_access_token(user_id)
        if not access_token:
            raise Exception(f"No valid access token available for user: {user_id}")
        
        if not start_date:
            # V2 API expects ISO 8601 formatted UTC timestamps without timezone info
            start_date = (datetime.utcnow() - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
        if not end_date:
            end_date = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
            
        print(f"Fetching Dexcom V2 glucose data from {start_date} to {end_date}")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/users/self/egvs",
                params={
                    'startDate': start_date,
                    'endDate': end_date
                },
                headers={'Authorization': f'Bearer {access_token}'}
            )
            print(f"Dexcom V2 egvs response status: {response.status_code}")
            if response.status_code != 200:
                print(f"Dexcom V2 egvs error: {response.text}")
            response.raise_for_status()
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Dexcom API V2 - sandbox compatible"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v2/users/self",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()

    async def get_valid_access_token(self, user_id: str) -> Optional[str]:
        """Get a valid access token for the user, automatically refreshing if expired"""
        from app.db import get_user_tokens, save_user_tokens, is_token_valid
        
        token_doc = await get_user_tokens(user_id)
        if not token_doc:
            print(f"❌ No tokens found for user: {user_id}")
            return None
        
        # Check if current token is still valid
        if await is_token_valid(user_id):
            print(f"✅ Access token still valid for user: {user_id}")
            return token_doc["access_token"]
        
        # Token expired, attempt to refresh
        print(f"🔄 Access token expired for user {user_id}, attempting refresh...")
        try:
            refresh_token = token_doc.get("refresh_token")
            if not refresh_token:
                print(f"❌ No refresh token available for user: {user_id}")
                return None
            
            # Refresh the token
            refresh_response = await self.refresh_access_token(refresh_token)
            
            # Extract new token information
            new_access_token = refresh_response['access_token']
            new_refresh_token = refresh_response.get('refresh_token', refresh_token)  # Keep old if not provided
            new_expires_in = refresh_response['expires_in']
            
            # Store the new tokens
            await save_user_tokens(user_id, new_access_token, new_refresh_token, new_expires_in)
            print(f"✅ Successfully refreshed tokens for user: {user_id}")
            
            return new_access_token
            
        except Exception as e:
            print(f"❌ Failed to refresh token for user {user_id}: {str(e)}")
            return None

dexcom_service = DexcomService()
