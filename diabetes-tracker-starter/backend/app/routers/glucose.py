from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta, timezone
from app.db import get_user_tokens, is_token_valid
from app.services.dexcom_service import dexcom_service
from app.services.real_data_service import real_data_service
from typing import List, Dict, Any

router = APIRouter()

@router.get('/glucose')
async def glucose(range: str = '24h', user_id: str = "default_user"):
    """Get glucose data - try real Dexcom data first, fallback to real CSV data, then synthetic"""

    # Validate range parameter
    valid_ranges = ['3h', '6h', '12h', '24h']
    if range not in valid_ranges:
        raise HTTPException(status_code=400, detail=f"Invalid range. Must be one of: {valid_ranges}")
    
    # Convert range to hours
    range_hours = {
        '3h': 3,
        '6h': 6,
        '12h': 12,
        '24h': 24
    }[range]
    
    # Try to get real Dexcom data first
    try:
        # Check if user has valid tokens
        if await is_token_valid(user_id):
            token_doc = await get_user_tokens(user_id)
            access_token = token_doc['access_token']

            # Calculate date range
            now = datetime.now(timezone.utc)
            start_date = now - timedelta(hours=range_hours)

            # Fetch real data from Dexcom
            dexcom_data = await dexcom_service.get_glucose_data(
                access_token=access_token,
                start_date=start_date.isoformat(),
                end_date=now.isoformat()
            )

            # Transform and return real data
            real_data = transform_dexcom_data(dexcom_data)
            if real_data:
                return {
                    'source': 'dexcom',
                    'data': real_data,
                    'range': range
                }

    except Exception as e:
        # Log error but continue to fallback
        print(f"Failed to fetch Dexcom data: {e}")

    # Try to get real data from CSV file
    try:
        real_csv_data = real_data_service.get_glucose_data(hours=range_hours)
        if real_csv_data:
            return {
                'source': 'real_csv',
                'data': real_csv_data,
                'range': range,
                'message': 'Using real glucose data from your Dexcom export'
            }
    except Exception as e:
        print(f"Failed to load CSV data: {e}")

    # Final fallback to synthetic data
    data = synth_points(range_hours)
    return {
        'source': 'synthetic',
        'data': data,
        'range': range,
        'message': 'Using synthetic data - no real data available'
    }

def transform_dexcom_data(dexcom_response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Transform Dexcom API response to our format"""
    transformed = []

    if 'egvs' in dexcom_response:
        for egv in dexcom_response['egvs']:
            # Convert Dexcom timestamp to ISO format
            # Dexcom uses milliseconds since epoch
            ts = datetime.fromtimestamp(egv['systemTime'] / 1000, tz=timezone.utc)

            transformed.append({
                'ts': ts.isoformat(),
                'mgdl': egv['value'],
                'trend': egv.get('trend', 'unknown'),
                'trendRate': egv.get('trendRate', None)
            })

    return transformed

# Keep synthetic data as final fallback
def synth_points(hours: int):
    now = datetime.now(timezone.utc)
    pts = []
    # For shorter time ranges, use more frequent sampling
    if hours <= 6:
        interval_minutes = 15  # 15-minute intervals for short ranges
    elif hours <= 12:
        interval_minutes = 30  # 30-minute intervals for medium ranges
    else:
        interval_minutes = 60  # 1-hour intervals for longer ranges
    
    num_points = (hours * 60) // interval_minutes
    
    for i in range(num_points):
        ts = now - timedelta(minutes=interval_minutes * i)
        base = 110
        swing = 30
        # Create more realistic patterns for different time ranges
        if hours <= 6:
            # Short range: more variation
            mgdl = base + (i % 8 - 4) / 4 * swing
        elif hours <= 12:
            # Medium range: moderate variation
            mgdl = base + (i % 12 - 6) / 6 * swing
        else:
            # Long range: gradual variation
            mgdl = base + (i % 24 - 12) / 12 * swing
        
        pts.append({'ts': ts.isoformat(), 'mgdl': round(mgdl, 1)})
    return list(reversed(pts))

@router.get('/glucose/summary')
async def glucose_summary():
    """Get summary statistics about available glucose data"""
    try:
        summary = real_data_service.get_data_summary()
        return {
            'success': True,
            'data': summary
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': None
        }
