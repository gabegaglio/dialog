# Diabetes Tracker — Starter Repo

## Structure
```
.
├─ frontend<img width="1470" height="828" alt="Screenshot 2025-10-21 at 2 17 49 PM" src="https://github.com/user-attachments/assets/c45c7de2-d8e2-427b-9b97-7c89ec3fe591" />
/   # Vite + React + TypeScript + Tailwind + React Query
└─ backend/    # FastAPI + MongoDB (motor) + httpx
```
├─ frontend
<img width="1470" height="828" alt="Screenshot 2025-10-21 at 2 17 49 PM" src="https://github.com/user-attachments/assets/c45c7de2-d8e2-427b-9b97-7c89ec3fe591" />
<img width="1470" height="728" alt="Screenshot 2025-10-21 at 2 18 15 PM" src="https://github.com/user-attachments/assets/ac61603a-44fa-49a1-b9f5-4e96fc632e10" />
<img width="1230" height="426" alt="Screenshot 2025-10-21 at 2 18 40 PM" src="https://github.com/user-attachments/assets/da447264-2b3b-4f57-a7de-ed17be842c62" />
<img width="1230" height="537" alt="Screenshot 2025-10-21 at 2 18 50 PM" src="https://github.com/user-attachments/assets/57fe10c2-9667-44cc-bffa-2575b3d1b31d" />
<img width="1229" height="310" alt="Screenshot 2025-10-21 at 2 18 59 PM" src="https://github.com/user-attachments/assets/8a0effa0-a814-48d4-907e-bd9536d7555d" />
<img width="671" height="778" alt="Screenshot 2025-10-21 at 2 20 12 PM" src="https://github.com/user-attachments/assets/bab45381-6502-4976-91a8-e13d123fa5b3" />

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

- **Frontend**: `VITE_API_BASE` (e.g., http://localhost:8000)
- **Backend**: Mongo URI, Dexcom sandbox credentials, OpenAI key, and auth secrets.

> ⚠️ For development, Dexcom **Sandbox** is required (do not use real PHI for this MVP).
