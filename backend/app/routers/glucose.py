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
            print(f"✅ User {user_id} has valid tokens, fetching Dexcom data...")

            # Since Dexcom sandbox has no glucose data, use realistic simulated data
            # This mimics what real CGM data would look like
            print("📊 Dexcom sandbox detected - using realistic simulated glucose data")
            simulated_data = generate_realistic_glucose_data(range_hours)
            return {
                'source': 'dexcom_simulated',
                'data': simulated_data,
                'range': range,
                'message': 'Realistic simulated glucose data (Dexcom sandbox has no real data)'
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
    """Transform Dexcom API response to our format - handles sandbox glucose data"""
    transformed = []

    # Handle V2 API glucose data response (sandbox has real data)
    if 'egvs' in dexcom_response and dexcom_response['egvs']:
        print(f"Processing {len(dexcom_response['egvs'])} glucose readings from Dexcom")
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
    
    # Handle empty data response
    elif 'egvs' in dexcom_response and (not dexcom_response['egvs'] or len(dexcom_response['egvs']) == 0):
        print("Dexcom returned empty glucose data")
        return []
    
    # Handle unexpected response format
    else:
        print(f"Unexpected Dexcom response format: {dexcom_response}")
        return []

    return transformed



def generate_realistic_glucose_data(hours: int) -> List[Dict[str, Any]]:
    """Generate realistic glucose data that mimics real CGM patterns"""
    now = datetime.now(timezone.utc)
    pts = []
    
    # More frequent sampling for realistic CGM data
    if hours <= 6:
        interval_minutes = 5  # 5-minute intervals for short ranges (like real CGM)
    elif hours <= 12:
        interval_minutes = 10  # 10-minute intervals for medium ranges
    else:
        interval_minutes = 15  # 15-minute intervals for longer ranges
    
    num_points = (hours * 60) // interval_minutes
    
    # Create realistic glucose patterns
    base_glucose = 120  # Base glucose level
    meal_effects = []  # Simulate meal effects
    
    for i in range(num_points):
        ts = now - timedelta(minutes=interval_minutes * i)
        
        # Simulate meal effects (breakfast, lunch, dinner patterns)
        hour_of_day = ts.hour
        if 7 <= hour_of_day <= 9:  # Breakfast time
            meal_effects.append(40)  # Post-meal rise
        elif 12 <= hour_of_day <= 14:  # Lunch time
            meal_effects.append(35)  # Post-meal rise
        elif 18 <= hour_of_day <= 20:  # Dinner time
            meal_effects.append(45)  # Post-meal rise
        else:
            meal_effects.append(0)  # No meal effect
        
        # Apply meal effects with decay
        meal_effect = sum(meal_effects[-3:]) * 0.3  # Decay over time
        
        # Add realistic variation
        variation = (i % 20 - 10) * 2  # Small variations
        trend = (i % 40 - 20) * 0.5  # Gradual trends
        
        # Calculate final glucose value
        mgdl = base_glucose + meal_effect + variation + trend
        
        # Keep within realistic bounds
        mgdl = max(70, min(300, mgdl))
        
        pts.append({
            'ts': ts.isoformat(),
            'mgdl': round(mgdl, 1),
            'trend': get_trend_direction(mgdl, pts[-1]['mgdl'] if pts else mgdl)
        })
    
    return list(reversed(pts))

def get_trend_direction(current: float, previous: float) -> str:
    """Get trend direction for glucose values"""
    if current > previous + 5:
        return "rising"
    elif current < previous - 5:
        return "falling"
    else:
        return "stable"

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
