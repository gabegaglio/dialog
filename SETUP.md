# Dexcom API Setup Guide

## Overview

This project now has full Dexcom API integration implemented according to the [official Dexcom API documentation](https://developer.dexcom.com/docs/dexcom/authentication). The system will automatically use real Dexcom data when available, with fallback to synthetic data.

## Current Status ✅

- **Backend**: FastAPI server with Dexcom OAuth 2.0 flow
- **Frontend**: React app with connection management UI
- **Data Source**: Automatic fallback (Dexcom → Synthetic)
- **UI**: White/black theme with data source indicators

## Setup Steps

### 1. Get Dexcom API Credentials

1. Go to [developer.dexcom.com](https://developer.dexcom.com/)
2. Register as a developer
3. Create a new application
4. Note your `client_id` and `client_secret`
5. Set your redirect URI to: `http://localhost:5173/auth/callback`

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
DB_NAME=diabetes_mvp

# Dexcom API Configuration (Sandbox)
DEXCOM_CLIENT_ID=your_actual_client_id_here
DEXCOM_CLIENT_SECRET=your_actual_client_secret_here
DEXCOM_REDIRECT_URI=http://localhost:5173/auth/callback

# OpenAI API Key (for chat functionality)
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the Application

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Connect to Dexcom

1. Open [http://localhost:5173](http://localhost:5173)
2. Go to Settings tab
3. Click "Connect to Dexcom"
4. Authorize in the new window
5. Return to see real data!

## API Endpoints

### Dexcom OAuth

- `GET /dexcom/connect?user_id={id}` - Start OAuth flow
- `GET /dexcom/callback?code={code}&state={state}` - OAuth callback
- `GET /dexcom/status/{user_id}` - Check connection status
- `POST /dexcom/disconnect/{user_id}` - Disconnect from Dexcom

### Glucose Data

- `GET /glucose?range={24h|7d|30d}&user_id={id}` - Get glucose data
- `GET /glucose/real-time?user_id={id}` - Get real-time data

## Data Flow

1. **No Connection**: Shows synthetic data with yellow indicator
2. **Connected**: Automatically fetches real Dexcom data with green indicator
3. **Token Expired**: Automatically falls back to synthetic data
4. **Reconnection**: User can reconnect via Settings

## Features

- **Automatic Fallback**: Seamlessly switches between real and synthetic data
- **Token Management**: Handles OAuth token refresh automatically
- **Real-time Updates**: Can fetch live glucose data when connected
- **User Management**: Supports multiple users (currently using "default_user")
- **Error Handling**: Graceful degradation when API calls fail

## Next Steps

- [ ] Implement user authentication system
- [ ] Add real-time data streaming
- [ ] Implement AI chat with glucose context
- [ ] Add data export functionality
- [ ] Implement alerts and notifications
