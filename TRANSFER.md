# Dexcom OAuth Implementation

This document contains the complete implementation of a Dexcom OAuth flow that you can integrate into your main application. The implementation includes a FastAPI backend and React TypeScript frontend.

## Backend (FastAPI)

### `app.py`

```python
# Dexcom OAuth Practice Backend
# This FastAPI server will handle OAuth token exchange with Dexcom

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
import secrets

# Load .env from the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Create FastAPI app instance
app = FastAPI(
    title="Dexcom OAuth API",
    description="Backend API for Dexcom OAuth authentication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class TokenRequest(BaseModel):
    code: str
    state: str

class DexcomDataRequest(BaseModel):
    access_token: str

# Dexcom OAuth configuration - SANDBOX ENVIRONMENT
DEXCOM_CLIENT_ID = os.getenv('DEXCOM_CLIENT_ID', 'your_dexcom_client_id')
DEXCOM_CLIENT_SECRET = os.getenv('DEXCOM_CLIENT_SECRET', 'your_dexcom_client_secret')
DEXCOM_REDIRECT_URI = os.getenv('DEXCOM_REDIRECT_URI', 'http://localhost:3000/callback')
DEXCOM_AUTH_URL = os.getenv('DEXCOM_AUTH_URL', 'https://sandbox-api.dexcom.com/v2/oauth2/login')
DEXCOM_TOKEN_URL = os.getenv('DEXCOM_TOKEN_URL', 'https://sandbox-api.dexcom.com/v2/oauth2/token')
DEXCOM_API_URL = os.getenv('DEXCOM_API_URL', 'https://sandbox-api.dexcom.com/v2/users/self/dataRange')

@app.get('/api/auth/url')
async def get_auth_url():
    """Generate Dexcom OAuth authorization URL"""
    # generates random string 16 characters long, generate self to verify later
    state = secrets.token_urlsafe(16)
    # generates auth url by appending info to auth original url
    auth_url = f"{DEXCOM_AUTH_URL}?" + \
               f"client_id={DEXCOM_CLIENT_ID}&" + \
               f"redirect_uri={DEXCOM_REDIRECT_URI}&" + \
               f"response_type=code&" + \
               f"scope=offline_access&" + \
               f"state={state}"
    # returned in app.jsx in getAuthUrl when await fetch "http://localhost:8000/api/auth/url"
    return {'authUrl': auth_url}

@app.post('/api/auth/token')
async def exchange_token(request: TokenRequest):
    """Exchange authorization code for access token"""
    try:
        # get auth code from request
        code = request.code

        # validate we got code
        if not code:
            raise HTTPException(status_code=400, detail='auth code required')

        # payload, prepare data to send to dexcom
        token_data = {
            'client_id': DEXCOM_CLIENT_ID,
            'client_secret': DEXCOM_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': DEXCOM_REDIRECT_URI
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        # make request to dexcom token endpoint, step 4 code
        response = requests.post(
            DEXCOM_TOKEN_URL, #https://api.dexcom.com/v2/oauth2/token
            data=token_data,
            headers=headers
        )

        # Check if the request was successful
        if response.status_code == 200:
            # Return the tokens from Dexcom
            return response.json()
        else:
            # Return error information
            raise HTTPException(
                status_code=response.status_code,
                detail=f'Failed to exchange authorization code for token: {response.text}'
            )

    except HTTPException:
        raise
    except Exception as e:
        # Handle any unexpected errors
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@app.post('/api/dexcom/data')
async def get_dexcom_data(request: DexcomDataRequest):
    """Get data from Dexcom API using access token"""
    try:
        access_token = request.access_token

        if not access_token:
            raise HTTPException(status_code=400, detail='access_token required')

        # Make the actual Dexcom API call here
        url = DEXCOM_API_URL
        headers = {"Authorization": f"Bearer {access_token}"}

        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f'Failed to get Dexcom data: {response.text}'
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@app.get('/api/health')
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'OK',
        'message': 'Python FastAPI backend server is running'
    }

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    print(f"Backend server running on port {port}")
    print(f"Dexcom OAuth redirect URI: {DEXCOM_REDIRECT_URI}")
    print(f"Using SANDBOX environment: {DEXCOM_AUTH_URL}")
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### `requirements.txt`

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.1.1
requests==2.32.5
pydantic==2.5.0
```

## Frontend (React TypeScript)

### `App.tsx`

```typescript
// Dexcom OAuth Practice App
// This component will handle the complete OAuth flow

import React, { useState, useEffect } from "react";

// State variables you'll need:
// - authUrl: stores the authorization URL from backend
// - isLoading: tracks loading states
// - authResult: stores the final authorization result (tokens)
// - error: stores any error messages

// Functions you'll need to implement:

// 1. getAuthUrl()
// - Makes API call to backend /api/auth/url endpoint
// - Stores the returned authorization URL in state
// - Handles loading states and errors

// 2. handleAuthCallback(code, state)
// - Called when user returns from Dexcom with authorization code
// - Makes API call to backend /api/auth/token endpoint
// - Sends the authorization code to exchange for tokens
// - Stores the resulting tokens in state
// - Handles success/error states

// 3. startAuth()
// - Redirects user to Dexcom authorization URL
// - Called when user clicks "Authorize with Dexcom" button

// 4. resetAuth()
// - Clears all state variables
// - Resets the app to initial state

// 5. useEffect hook
// - Checks URL parameters for authorization code on component mount
// - Automatically calls handleAuthCallback if code is present

// UI Components you'll need:
// - Header with title and description
// - Step 1: Button to get authorization URL
// - Step 2: Button to start OAuth flow (only shown after getting URL)
// - Success section: Display tokens when authorization is complete
// - Error section: Display any error messages
// - Loading states for buttons and API calls

// The app should follow this flow:
// 1. User clicks "Get Auth URL" → calls getAuthUrl()
// 2. User clicks "Authorize with Dexcom" → calls startAuth()
// 3. User completes authorization on Dexcom site
// 4. User returns with code → useEffect triggers handleAuthCallback()
// 5. App displays tokens or error message

// Type definitions
interface AuthResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  [key: string]: any; // Allow additional properties from Dexcom
}

interface DexcomData {
  [key: string]: any; // Flexible structure for Dexcom API responses
}

function App(): React.JSX.Element {
  const [authUrl, setAuthUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dexcomData, setDexcomData] = useState<DexcomData | null>(null);

  const handleAuthCallback = async (
    code: string,
    state: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("http://localhost:8000/api/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
      });
      const data = await response.json();

      if (response.ok) {
        setAuthResult(data);
        setError(null);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else {
        setError(data.error || "Authorization failed");
      }
    } catch (error) {
      setError("Failed auth");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the auth URL directly and redirect immediately
      const response = await fetch("http://localhost:8000/api/auth/url");
      const data = await response.json();

      // Redirect immediately with the URL from the response
      window.location.href = data.authUrl;
    } catch (error) {
      setError((error as Error).message);
      setIsLoading(false);
    }
  };

  const resetAuth = (): void => {
    setAuthUrl("");
    setAuthResult(null);
    setError("");
    setDexcomData(null);
  };

  const handleDexcomAPI = async (): Promise<void> => {
    if (!authResult?.access_token) {
      setError("No access token available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call your Python backend endpoint that will make the actual Dexcom API call
      const response = await fetch("http://localhost:8000/api/dexcom/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: authResult.access_token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Dexcom data:", data);
        setDexcomData(data);
        setError(null);
      } else {
        setError(`Failed to get Dexcom data: ${response.statusText}`);
      }
    } catch (error) {
      setError(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // gets everything after ? in url -> http://localhost:3000/callback?code=ABC123&state=XYZ789
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    if (code && state) {
      // pass code and state to handleAuth
      handleAuthCallback(code, state);
    }
  }, []);

  return (
    <div className="app-container">
      <h1>Dexcom OAuth Practice</h1>

      <button onClick={startAuth} disabled={isLoading} className="btn-primary">
        {isLoading ? "Loading..." : "Authorize with Dexcom"}
      </button>

      <button onClick={resetAuth} className="btn-secondary">
        Reset
      </button>

      {isLoading && <p className="loading-message">Loading...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {authResult && (
        <div className="success-box">
          <h2>🎉 Authorization Successful!</h2>
          <div>
            <p>
              <strong>Access Token:</strong> {authResult.access_token}
            </p>
            <p>
              <strong>Refresh Token:</strong> {authResult.refresh_token}
            </p>
            <p>
              <strong>Expires In:</strong> {authResult.expires_in} seconds
            </p>
          </div>
          <button onClick={handleDexcomAPI} className="btn-success">
            Call Dexcom API
          </button>
        </div>
      )}

      {dexcomData && (
        <div className="dexcom-data-box">
          <h2>📊 Dexcom Data</h2>
          <div className="data-content">
            <pre>{JSON.stringify(dexcomData, null, 2)}</pre>
          </div>
          <button onClick={() => setDexcomData(null)} className="btn-secondary">
            Clear Data
          </button>
        </div>
      )}
    </div>
  );
}

export default App;


## Environment Variables

Create a `.env` file in your project root:

```env
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
DEXCOM_REDIRECT_URI=http://localhost:5173/callback
DEXCOM_AUTH_URL=https://sandbox-api.dexcom.com/v2/oauth2/login
DEXCOM_TOKEN_URL=https://sandbox-api.dexcom.com/v2/oauth2/token
DEXCOM_API_URL=https://sandbox-api.dexcom.com/v2/users/self/dataRange
PORT=8000
```

## Key Features

1. **Efficient OAuth Flow** - Single-click authorization with immediate redirect
2. **TypeScript Frontend** - Full type safety and modern React patterns
3. **FastAPI Backend** - High-performance Python backend with automatic API docs
4. **Error Handling** - Comprehensive error handling and user feedback
5. **Dexcom API Integration** - Ready-to-use Dexcom API calls
6. **Responsive Design** - Clean, centered UI that works on all devices

## Integration Notes

- Update the backend URLs in your frontend to match your main app's backend
- Adjust CORS origins in the FastAPI app to match your frontend domains
- The OAuth flow is completely self-contained and can be dropped into any app
- All state management is local to the component for easy integration
- The CSS classes are prefixed to avoid conflicts with your main app's styles

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The backend will be available at `http://localhost:8000` and the frontend at `http://localhost:5173`.
