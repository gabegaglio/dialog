from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from app.db import settings, save_user_tokens, get_user_tokens, is_token_valid, delete_user_tokens
from app.services.dexcom_service import dexcom_service
from app.models.user import UserToken
import secrets
from typing import Optional

router = APIRouter()

# In-memory storage for OAuth state (in production, use Redis or database)
oauth_states = {}

@router.get('/connect')
async def dexcom_connect(user_id: str = "default_user"):
    """Start OAuth flow - redirect user to Dexcom login"""
    # Generate state parameter for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = user_id
    
    # Generate authorization URL
    auth_url = dexcom_service.get_authorization_url(state=state)
    
    return {
        'authorization_url': auth_url,
        'state': state,
        'message': 'Redirect user to this URL to authorize Dexcom access'
    }

@router.get('/callback')
async def dexcom_callback(code: str, state: str):
    """Handle OAuth callback from Dexcom"""
    # Verify state parameter
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    user_id = oauth_states[state]
    del oauth_states[state]  # Clean up used state
    
    try:
        # Exchange authorization code for tokens
        token_response = await dexcom_service.exchange_code_for_tokens(code)
        
        # Extract token information
        access_token = token_response['access_token']
        refresh_token = token_response['refresh_token']
        expires_in = token_response['expires_in']
        
        # Store tokens in database
        await save_user_tokens(user_id, access_token, refresh_token, expires_in)
        
        return {
            'status': 'success',
            'message': 'Successfully connected to Dexcom',
            'user_id': user_id,
            'expires_in': expires_in
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to exchange code for tokens: {str(e)}")

@router.get('/status/{user_id}')
async def dexcom_status(user_id: str):
    """Check if user is connected to Dexcom and token status"""
    try:
        token_doc = await get_user_tokens(user_id)
        
        if not token_doc:
            return {
                'connected': False,
                'message': 'User not connected to Dexcom'
            }
        
        is_valid = await is_token_valid(user_id)
        
        return {
            'connected': True,
            'token_valid': is_valid,
            'expires_at': token_doc.get('expires_at'),
            'message': 'Token valid' if is_valid else 'Token expired'
        }
    except Exception as e:
        return {
            'connected': False,
            'message': f'Error checking status: {str(e)}'
        }

@router.post('/disconnect/{user_id}')
async def dexcom_disconnect(user_id: str):
    """Disconnect user from Dexcom (remove tokens)"""
    try:
        result = await delete_user_tokens(user_id)
        
        if result:
            return {'status': 'success', 'message': 'Successfully disconnected from Dexcom'}
        else:
            return {'status': 'not_found', 'message': 'User was not connected to Dexcom'}
    except Exception as e:
        return {'status': 'error', 'message': f'Error disconnecting: {str(e)}'}
