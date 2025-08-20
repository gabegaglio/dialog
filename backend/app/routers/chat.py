from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.chat_service import chat_service
from typing import Optional

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""
    user_id: str = "default_user"

class ChatResponse(BaseModel):
    success: bool
    response: str
    model: Optional[str] = None
    usage: Optional[dict] = None
    error: Optional[str] = None
    glucose_context_included: Optional[bool] = False

class GlucoseInsightRequest(BaseModel):
    analysis_type: str = "general"  # "general", "trends", "patterns", "recommendations"
    time_range: str = "24h"  # "3h", "6h", "12h", "24h"
    user_id: str = "default_user"

class GlucoseInsightResponse(BaseModel):
    success: bool
    insights: str
    data_summary: Optional[dict] = None
    recommendations: Optional[list] = None
    model: Optional[str] = None
    usage: Optional[dict] = None
    error: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Send a message to the AI chat and get a response"""
    try:
        # Get response from OpenAI
        result = await chat_service.get_chat_response(
            message=request.message,
            context=request.context,
            user_id=request.user_id
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process chat request: {str(e)}"
        )

@router.post("/chat/glucose-insights", response_model=GlucoseInsightResponse)
async def get_glucose_insights(request: GlucoseInsightRequest):
    """Get AI-powered insights and analysis of glucose data"""
    try:
        # Create a specific prompt for glucose analysis
        analysis_prompts = {
            "general": "Provide a comprehensive analysis of my glucose data including trends, patterns, and overall health insights.",
            "trends": "Analyze the trends in my glucose data over time. What patterns do you see?",
            "patterns": "What patterns can you identify in my glucose readings? Are there consistent highs or lows at certain times?",
            "recommendations": "Based on my glucose data, what lifestyle recommendations or monitoring suggestions do you have?"
        }
        
        prompt = analysis_prompts.get(request.analysis_type, analysis_prompts["general"])
        
        # Get response from OpenAI with glucose context
        result = await chat_service.get_chat_response(
            message=prompt,
            context=f"Please analyze my glucose data for the last {request.time_range}",
            user_id=request.user_id
        )
        
        if result["success"]:
            return GlucoseInsightResponse(
                success=True,
                insights=result["response"],
                model=result["model"],
                usage=result["usage"]
            )
        else:
            return GlucoseInsightResponse(
                success=False,
                error=result["error"],
                insights="Unable to generate insights at this time."
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate glucose insights: {str(e)}"
        )

@router.get("/chat/health")
async def chat_health():
    """Check if the chat service is working"""
    return {"status": "healthy", "service": "AI Chat"}
