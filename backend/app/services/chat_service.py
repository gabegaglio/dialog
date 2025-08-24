import openai
import os
import re
import httpx
from typing import Dict, Any, List
from datetime import datetime, timedelta

class ChatService:
    def __init__(self):
        self.client = None
        self._initialized = False
        
        # Define dangerous medical advice patterns to filter out
        self.dangerous_patterns = [
            r'\b(?:take|give|inject|administer|use)\s+\d+\s*(?:units?|iu|iu\'s)\s+insulin\b',
            r'\b(?:increase|decrease|adjust|change|modify)\s+(?:your\s+)?insulin\s+(?:dose|dosage|amount)\b',
            r'\b(?:stop|start|discontinue|begin)\s+(?:taking|using)\s+(?:insulin|medication|medicine)\b',
            r'\b(?:you\s+should|you\s+must|you\s+need\s+to)\s+(?:take|give|inject)\s+insulin\b',
            r'\b(?:prescribe|prescription)\s+(?:of\s+)?(?:insulin|medication)\b',
            r'\b(?:emergency|urgent|immediate|right\s+now)\s+(?:insulin|medication|treatment)\b'
        ]
        
        # Compile regex patterns for efficiency
        self.dangerous_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.dangerous_patterns]
    
    def _ensure_initialized(self):
        """Initialize the OpenAI client if not already done"""
        if not self._initialized:
            # Get API key directly from environment to avoid database dependencies
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.client = openai.OpenAI(api_key=api_key)
            self._initialized = True
    
    def _check_for_dangerous_content(self, text: str) -> bool:
        """Check if the text contains dangerous medical advice patterns"""
        text_lower = text.lower()
        
        # Check for dangerous patterns
        for pattern in self.dangerous_regex:
            if pattern.search(text):
                return True
        
        # Additional safety checks
        dangerous_phrases = [
            "take insulin", "give insulin", "inject insulin", "insulin dose",
            "prescription", "you should take insulin", "you must take insulin", "you need to take insulin"
        ]
        
        return any(phrase in text_lower for phrase in dangerous_phrases)
    
    def _clean_markdown_formatting(self, text: str) -> str:
        """Clean up markdown formatting for professional appearance"""
        # Remove bold formatting (**text** -> text)
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        
        # Remove italic formatting (*text* -> text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        
        # Remove header formatting (# ## ### -> clean text) - more thorough
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        text = re.sub(r'\n\s*#{1,6}\s+', '\n', text, flags=re.MULTILINE)
        
        # Remove code formatting (`text` -> text)
        text = re.sub(r'`(.*?)`', r'\1', text)
        
        # Remove link formatting ([text](url) -> text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        
        # Clean up extra whitespace and ensure proper formatting
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r'\n\s*-\s*', '\n- ', text)
        
        # Ensure proper spacing after header removal
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Clean up any remaining markdown artifacts
        text = re.sub(r'^\s*#{1,6}\s*$', '', text, flags=re.MULTILINE)
        
        return text.strip()

    def _add_safety_disclaimer(self, response: str) -> str:
        """Add safety disclaimers to AI responses"""
        safety_disclaimer = """

IMPORTANT SAFETY REMINDER:
- This information is for educational purposes only
- Never adjust medications or insulin doses without consulting your healthcare provider
- Always seek professional medical advice for treatment decisions
- In emergencies, call 911 or contact your doctor immediately
- This AI cannot diagnose, treat, or prescribe medications"""
        
        return response + safety_disclaimer
    
    async def _get_glucose_context(self, hours: int = 24, user_id: str = "default_user") -> str:
        """Get recent glucose data context for the AI"""
        try:
            # Convert hours to range string
            range_str = f"{hours}h"
            
            # Call the glucose endpoint to get data the same way frontend does
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://localhost:8000/glucose",
                    params={"range": range_str, "user_id": user_id}
                )
                
                if response.status_code != 200:
                    return f"Error fetching glucose data: HTTP {response.status_code}"
                
                glucose_response = response.json()
                glucose_data = glucose_response.get('data', [])
                source = glucose_response.get('source', 'unknown')
                
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
                
                # Format times nicely
                start_formatted = datetime.fromisoformat(start_time.replace('Z', '+00:00')).strftime('%m/%d %H:%M')
                end_formatted = datetime.fromisoformat(end_time.replace('Z', '+00:00')).strftime('%m/%d %H:%M')
                
                context = f"""
Recent Glucose Data (Last {hours} hours):
- Data Source: {source}
- Time Range: {start_formatted} to {end_formatted}
- Total Readings: {len(glucose_data)}
- Average: {avg_glucose:.1f} mg/dL
- Range: {min_glucose} - {max_glucose} mg/dL
- Low readings (<70 mg/dL): {low_count}
- Normal readings (70-180 mg/dL): {normal_count}
- High readings (>180 mg/dL): {high_count}

Latest Readings:
"""
                # Add last 5 readings for context
                for point in glucose_data[-5:]:
                    time_formatted = datetime.fromisoformat(point['ts'].replace('Z', '+00:00')).strftime('%H:%M')
                    context += f"- {time_formatted}: {point['mgdl']} mg/dL\n"
                
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
                glucose_context = await self._get_glucose_context(hours=24, user_id=user_id)
            
            # Create a comprehensive system prompt with balanced safety measures
            system_prompt = """You are a helpful AI assistant specialized in diabetes management and glucose monitoring. 
            You have access to the user's actual glucose data and can provide personalized insights and recommendations.
            
            🚨 IMPORTANT SAFETY RULES:
            1. NEVER suggest specific insulin doses, amounts, or medication changes
            2. NEVER give medical advice, treatment plans, or prescriptions
            3. NEVER tell users to start, stop, or modify medications
            4. NEVER make medical diagnoses or treatment recommendations
            5. NEVER suggest emergency medical actions beyond calling 911
            
            ✅ WHAT YOU CAN DO:
            - Analyze glucose patterns, trends, and insights from data
            - Provide educational information about diabetes
            - Suggest lifestyle modifications (diet, exercise, stress management)
            - Help interpret glucose readings and ranges
            - Identify concerning patterns and recommend when to seek medical attention
            - Provide general diabetes education and awareness
            - Give detailed trend analysis and data interpretation
            
            ✅ RESPONSE FORMATTING REQUIREMENTS:
            - Use clean, professional formatting without markdown symbols (no **, ##, ###, or other markdown)
            - NEVER use headers (# ## ###) - use clear section titles in plain text instead
            - Write in clear, organized paragraphs with proper punctuation
            - Use bullet points with simple dashes (-) for lists when helpful
            - Present glucose readings in a clean, readable format
            - Use proper spacing and paragraph breaks for easy reading
            - Write in a professional, medical-adjacent tone
            - Ensure all responses are punctual, organized, and easy to read
            - Structure responses with clear section breaks using blank lines, not headers
            
            ✅ RESPONSE APPROACH:
            - Be helpful, informative, and educational
            - Provide detailed analysis of glucose patterns and trends
            - Suggest lifestyle considerations (never medical)
            - If you see concerning patterns, mention consulting healthcare provider
            - Focus on data interpretation and educational insights
            
            Remember: You are an EDUCATIONAL TOOL that helps users understand their glucose data, not a medical professional."""
            
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
                temperature=0.5  # Balanced temperature for helpful but safe responses
            )
            
            ai_response = response.choices[0].message.content
            
            # Clean up markdown formatting for professional appearance
            ai_response = self._clean_markdown_formatting(ai_response)
            
            # Safety check: only block the most dangerous content
            if self._check_for_dangerous_content(ai_response):
                # Replace dangerous response with safe alternative
                ai_response = """I apologize, but I cannot provide specific medical advice or recommendations about medications or insulin dosing. 

Instead, I can help you understand your glucose data patterns and provide general educational information about diabetes management.

For any medical decisions, medication changes, or treatment plans, please consult your healthcare provider directly. They are the only ones qualified to give you personalized medical advice.

What specific aspect of your glucose data would you like me to help you understand or analyze?"""
            
            # Only add safety disclaimer occasionally, not every time
            # This prevents repetitive warnings while maintaining safety awareness
            
            return {
                "success": True,
                "response": ai_response,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "glucose_context_included": include_glucose,
                "safety_checked": True
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                "glucose_context_included": False,
                "safety_checked": False
            }

chat_service = ChatService()
