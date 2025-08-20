import json
import os
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

class RealDataService:
    def __init__(self):
        # The CSV file is in the root directory, not in diabetes-tracker-starter
        self.data_file = Path(__file__).parent.parent.parent.parent.parent / "csvjson.json"
        self._cached_data = None
        self._last_load = None
    
    def _load_data(self) -> List[Dict[str, Any]]:
        """Load and cache the CSV data"""
        # Cache data for 5 minutes to avoid repeated file reads
        if self._cached_data and self._last_load and (datetime.now() - self._last_load).seconds < 300:
            return self._cached_data
        
        try:
            print(f"Attempting to load data from: {self.data_file}")
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                self._cached_data = data
                self._last_load = datetime.now()
                print(f"Successfully loaded {len(data)} entries from CSV")
                return data
        except Exception as e:
            print(f"Error loading real data: {e}")
            return []
    
    def _filter_glucose_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter only EGV (glucose) events and clean the data"""
        glucose_data = []
        
        for entry in data:
            if entry.get("Event Type") == "EGV":
                timestamp_str = entry.get("Timestamp (YYYY-MM-DDThh:mm:ss)")
                glucose_value = entry.get("Glucose Value (mg/dL)")
                
                if timestamp_str and glucose_value and glucose_value != "":
                    try:
                        # Parse timestamp
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        
                        glucose_data.append({
                            "ts": timestamp.isoformat(),
                            "mgdl": int(glucose_value),
                            "trend": "stable",  # We could calculate this from rate of change if available
                            "trendRate": None,
                            "source": "real_dexcom"
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Error parsing entry {entry.get('Index')}: {e}")
                        continue
        
        # Sort by timestamp
        glucose_data.sort(key=lambda x: x["ts"])
        return glucose_data
    
    def get_glucose_data(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get glucose data for the specified time range"""
        data = self._load_data()
        if not data:
            return []
        
        glucose_data = self._filter_glucose_data(data)
        if not glucose_data:
            return []
        
        # Calculate the cutoff time
        if glucose_data:
            latest_time = datetime.fromisoformat(glucose_data[-1]["ts"].replace('Z', '+00:00'))
            cutoff_time = latest_time - timedelta(hours=hours)
            
            # Filter data within the time range
            filtered_data = [
                entry for entry in glucose_data
                if datetime.fromisoformat(entry["ts"].replace('Z', '+00:00')) >= cutoff_time
            ]
            
            return filtered_data
        
        return []
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary statistics about the available data"""
        data = self._load_data()
        glucose_data = self._filter_glucose_data(data)
        
        if not glucose_data:
            return {
                "total_readings": 0,
                "date_range": None,
                "avg_glucose": 0,
                "min_glucose": 0,
                "max_glucose": 0
            }
        
        glucose_values = [entry["mgdl"] for entry in glucose_data]
        timestamps = [entry["ts"] for entry in glucose_data]
        
        return {
            "total_readings": len(glucose_data),
            "date_range": {
                "start": timestamps[0],
                "end": timestamps[-1]
            },
            "avg_glucose": round(sum(glucose_values) / len(glucose_values), 1),
            "min_glucose": min(glucose_values),
            "max_glucose": max(glucose_values)
        }

real_data_service = RealDataService()
