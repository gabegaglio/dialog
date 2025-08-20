import openai
import os
from typing import Dict, Any, List
from app.services.real_data_service import real_data_service
from datetime import datetime, timedelta

class ChatService:
    def __init__(self):
        self.client = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Initialize the OpenAI client if not already done"""
        if not self._initialized:
            # Get API key directly from environment to avoid database dependencies
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.client = openai.OpenAI(api_key=api_key)
            self._initialized = True
    
    def _get_glucose_context(self, hours: int = 24) -> str:
        """Get recent glucose data context for the AI"""
        try:
            glucose_data = real_data_service.get_glucose_data(hours=hours)
            if not glucose_data:
                return "No recent glucose data available."
            
            # Calculate key metrics
            glucose_values = [point['mgdl'] for point in glucose_data]
            avg_glucose = sum(glucose_values) / len(glucose_values)
            min_glucose = min(glucose_values)
            max_glucose = max(glucose_values)
            
            # Get time range
            start_time = glucose_data[0]['ts']
            end_time = glucose_data[-1]['ts']
            
            # Count readings in different ranges
            low_count = len([g for g in glucose_values if g < 70])
            normal_count = len([g for g in glucose_values if 70 <= g <= 180])
            high_count = len([g for g in glucose_values if g > 180])
            
            context = f"""
Recent Glucose Data (Last {hours} hours):
- Time Range: {start_time} to {end_time}
- Total Readings: {len(glucose_data)}
- Average: {avg_glucose:.1f} mg/dL
- Range: {min_glucose} - {max_glucose} mg/dL
- Low (<70): {low_count} readings
- Normal (70-180): {normal_count} readings  
- High (>180): {high_count} readings

Latest Readings:
"""
            # Add last 5 readings for context
            for i, point in enumerate(glucose_data[-5:]):
                context += f"- {point['ts']}: {point['mgdl']} mg/dL\n"
            
            return context
            
        except Exception as e:
            return f"Error loading glucose data: {str(e)}"
    
    def _should_include_glucose_context(self, message: str) -> bool:
        """Determine if the message is health/glucose related and should include data context"""
        health_keywords = [
            'glucose', 'blood sugar', 'diabetes', 'health', 'trend', 'pattern',
            'high', 'low', 'average', 'reading', 'level', 'mg/dl', 'mg/dL',
            'how am i', 'how is my', 'what is my', 'analyze', 'insight',
            'recommendation', 'advice', 'help', 'problem', 'issue'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in health_keywords)
    
    async def get_chat_response(self, message: str, context: str = "", user_id: str = "default_user") -> Dict[str, Any]:
        """Get a response from OpenAI based on the user's message with glucose context if relevant"""
        try:
            self._ensure_initialized()
            
            # Determine if we should include glucose context
            include_glucose = self._should_include_glucose_context(message)
            glucose_context = ""
            
            if include_glucose:
                # Get 24 hours of glucose data for context
                glucose_context = self._get_glucose_context(hours=24)
            
            # Create a comprehensive system prompt
            system_prompt = """You are a helpful AI assistant specialized in diabetes management and glucose monitoring. 
            You have access to the user's actual glucose data and can provide personalized insights and recommendations.
            
            IMPORTANT GUIDELINES:
            - Always prioritize user safety and recommend consulting healthcare professionals for medical decisions
            - Use the provided glucose data to give personalized, data-driven insights
            - Be supportive, informative, and educational
            - If glucose data shows concerning patterns (many lows, sustained highs), emphasize the importance of medical consultation
            - Provide practical lifestyle and monitoring advice
            - Never make definitive medical diagnoses or treatment recommendations
            
            When analyzing glucose data:
            - Look for patterns, trends, and potential issues
            - Identify times of day with consistent highs or lows
            - Suggest lifestyle adjustments that might help
            - Recommend when to seek medical advice
            """
            
            # Build the full context
            full_context = system_prompt
            if glucose_context:
                full_context += f"\n\nUSER'S GLUCOSE DATA:\n{glucose_context}"
            if context:
                full_context += f"\n\nADDITIONAL CONTEXT:\n{context}"
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": full_context},
                    {"role": "user", "content": message}
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            return {
                "success": True,
                "response": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "glucose_context_included": include_glucose
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                "glucose_context_included": False
            }

chat_service = ChatService()
