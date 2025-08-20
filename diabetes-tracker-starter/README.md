# Diabetes Tracker — Starter Repo

This is a minimal **starter repo** for the Diabetes Tracker MVP described in `diabetes-tracker-mvp.md`.

## Structure
```
.
├─ frontend/   # Vite + React + TypeScript + Tailwind + React Query
└─ backend/    # FastAPI + MongoDB (motor) + httpx
```

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Env
Copy `.env.example` to `.env` in each folder and fill values.

- **Frontend**: `VITE_API_BASE` (e.g., http://localhost:8000)
- **Backend**: Mongo URI, Dexcom sandbox credentials, OpenAI key, and auth secrets.

> ⚠️ For development, Dexcom **Sandbox** is required (do not use real PHI for this MVP).
