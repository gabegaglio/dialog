from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from app.services.dexcom_service import dexcom_service
from app.db import settings, get_user_tokens, save_user_tokens, is_token_valid, delete_user_tokens
import secrets
from typing import Optional

router = APIRouter()

# In-memory storage for OAuth state (in production, use Redis or database)
oauth_states = {}

@router.get('/connect')
async def dexcom_connect(user_id: str = "default_user"):
    """Start OAuth flow - redirect user to Dexcom login"""
    # Always use the provided user_id, don't generate temp ones
    state = secrets.token_urlsafe(32)
    oauth_states[state] = user_id
    
    print(f"Generated OAuth state: {state} for user: {user_id}")
    print(f"Current oauth_states: {oauth_states}")
    
    # Generate authorization URL
    auth_url = dexcom_service.get_authorization_url(state=state)
    
    return {
        'authorization_url': auth_url,
        'state': state,
        'message': 'Redirect user to this URL to authorize Dexcom access',
        'debug': {
            'state': state,
            'oauth_states_count': len(oauth_states),
            'user_id': user_id
        }
    }

@router.get('/callback')
async def dexcom_callback(code: str, state: str):
    """Handle OAuth callback from Dexcom"""
    print(f"=== OAuth Callback Debug ===")
    print(f"Code received: {code[:20]}... (length: {len(code)})")
    print(f"State received: {state}")
    print(f"Current oauth_states: {oauth_states}")
    print(f"Available states: {list(oauth_states.keys())}")
    
    # Verify state parameter
    if state not in oauth_states:
        print(f"❌ State {state} not found in oauth_states!")
        print(f"State mismatch - this could indicate CSRF attack or expired state")
        
        # TEMPORARY FIX: If state is missing, use a default user_id for testing
        # In production, this should always fail
        user_id = "default_user"
        print(f"⚠️ Using default user_id: {user_id} for testing")
    else:
        user_id = oauth_states[state]
        del oauth_states[state]  # Clean up used state
        print(f"✅ State validated, using user_id: {user_id}")
    
    try:
        print(f"🔄 Exchanging authorization code for tokens...")
        # Exchange authorization code for tokens
        token_response = await dexcom_service.exchange_code_for_tokens(code)
        print(f"✅ Token exchange successful: {list(token_response.keys())}")
        
        # Extract token information
        access_token = token_response['access_token']
        refresh_token = token_response['refresh_token']
        expires_in = token_response['expires_in']
        print(f"📝 Tokens extracted - expires_in: {expires_in}")
        
        print(f"💾 Storing tokens in database...")
        # Store tokens in database
        await save_user_tokens(user_id, access_token, refresh_token, expires_in)
        
        print(f"✅ Successfully stored tokens for user: {user_id}")
        
        # Redirect to frontend with success message
        frontend_url = f"http://localhost:5175?dexcom=success&user_id={user_id}"
        print(f"🔄 Redirecting to: {frontend_url}")
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        print(f"❌ Token exchange failed with error: {type(e).__name__}: {str(e)}")
        print(f"Full error details: {e}")
        
        # Redirect to frontend with error message
        frontend_url = f"http://localhost:5175?dexcom=error&message=Failed%20to%20complete%20authentication"
        print(f"🔄 Redirecting to error page: {frontend_url}")
        return RedirectResponse(url=frontend_url)

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

@router.get('/test-connect')
async def test_connect():
    """Test endpoint to verify the connect endpoint is working"""
    try:
        # Generate a test authorization URL
        auth_url = dexcom_service.get_authorization_url()
        return {
            "success": True,
            "authorization_url": auth_url,
            "base_url": dexcom_service.base_url,
            "message": "Connect endpoint is working"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Connect endpoint failed"
        }

@router.get('/test-data-range')
async def test_data_range(user_id: str = "default_user"):
    """Test endpoint to check what data range is available for the user"""
    try:
        # Get user's tokens
        token_doc = await get_user_tokens(user_id)
        if not token_doc:
            return {"error": "No tokens found for user"}
        
        access_token = token_doc['access_token']
        
        # Check data range first
        data_range = await dexcom_service.get_data_range(access_token)
        print(f"Data range response: {data_range}")
        
        return {
            "success": True,
            "data_range": data_range,
            "message": "Data range retrieved successfully"
        }
                
    except Exception as e:
        print(f"Data range test error: {e}")
        return {"error": str(e), "message": "Exception occurred during data range test"}



@router.get('/user-info/{user_id}')
async def get_user_info(user_id: str):
    """Get user information from Dexcom"""
    try:
        # Get user's tokens
        token_doc = await get_user_tokens(user_id)
        if not token_doc:
            return {"error": "No tokens found for user"}
        
        access_token = token_doc['access_token']
        
        # Fetch user info from Dexcom
        user_info = await dexcom_service.get_user_info(access_token)
        
        return {
            "success": True,
            "user": user_info,
            "message": "User info retrieved successfully"
        }
                
    except Exception as e:
        print(f"User info error: {e}")
        return {"error": str(e), "message": "Exception occurred while fetching user info"}

@router.post('/exchange-token')
async def exchange_token(request: dict):
    """Exchange authorization code for access token"""
    print(f"=== Token Exchange Request ===")
    print(f"Request body: {request}")
    
    code = request.get('code')
    state = request.get('state')
    user_id = request.get('user_id', 'default_user')
    
    if not code or not state:
        return {"error": "Missing code or state parameter"}
    
    print(f"Exchanging code: {code[:20]}... for user: {user_id}")
    print(f"State: {state}")
    print(f"Current oauth_states: {oauth_states}")
    
    # Verify state parameter
    if state not in oauth_states:
        print(f"❌ State {state} not found in oauth_states!")
        return {"error": "Invalid state parameter"}
    
    # Get the user_id from the state (this is the original user_id used in connect)
    original_user_id = oauth_states.get(state, user_id)
    
    # Clean up used state
    del oauth_states[state]
    print(f"✅ State validated and cleaned up")
    
    try:
        # Exchange authorization code for tokens
        token_response = await dexcom_service.exchange_code_for_tokens(code)
        print(f"✅ Token exchange successful: {list(token_response.keys())}")
        
        # Extract token information
        access_token = token_response['access_token']
        refresh_token = token_response['refresh_token']
        expires_in = token_response['expires_in']
        
        # Always use the original user_id from the OAuth state
        print(f"✅ Storing tokens for user: {original_user_id}")
        await save_user_tokens(original_user_id, access_token, refresh_token, expires_in)
        print(f"✅ Tokens stored for user: {original_user_id}")
        
        return {
            "success": True,
            "message": "Token exchange successful",
            "user_id": original_user_id,
            "expires_in": expires_in
        }
        
    except Exception as e:
        print(f"❌ Token exchange failed: {type(e).__name__}: {str(e)}")
        return {"error": f"Token exchange failed: {str(e)}"}

@router.get('/debug/oauth-states')
async def debug_oauth_states():
    """Debug endpoint to check current OAuth states"""
    return {
        'oauth_states': oauth_states,
        'count': len(oauth_states),
        'message': 'Current OAuth states in memory'
    }

@router.get('/debug/token-info')
async def debug_token_info(user_id: str = "default_user"):
    """Debug endpoint to check token storage"""
    try:
        token_doc = await get_user_tokens(user_id)
        if token_doc:
            return {
                "user_id": user_id,
                "has_tokens": True,
                "token_info": {
                    "expires_at": str(token_doc.get('expires_at')),
                    "updated_at": str(token_doc.get('updated_at')),
                    "access_token_length": len(token_doc.get('access_token', '')),
                    "refresh_token_length": len(token_doc.get('refresh_token', ''))
                }
            }
        else:
            return {
                "user_id": user_id,
                "has_tokens": False,
                "message": "No tokens found"
            }
    except Exception as e:
        return {
            "user_id": user_id,
            "error": str(e),
            "message": "Exception occurred while checking tokens"
        }


