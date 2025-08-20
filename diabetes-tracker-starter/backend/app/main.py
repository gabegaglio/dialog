from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, auth, dexcom, glucose, chat

app = FastAPI(title="Diabetes Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(dexcom.router, prefix="/dexcom")
app.include_router(glucose.router, prefix="")
app.include_router(chat.router, prefix="")

