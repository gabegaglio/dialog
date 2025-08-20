# Diabetes Tracker — MVP Specification

A minimal viable product (MVP) for a **Dexcom-connected diabetes tracker** with an **AI chat assistant**. The app reads glucose from the **Dexcom Sandbox API**, visualizes trends, and answers user questions based on their data.

> ⚠️ **Disclaimer**: This tool is for **information/education only** and **not medical advice**.


## 0) Goals & Non‑Goals

**Goals**
- Connect a user’s Dexcom **Sandbox** account via OAuth and read CGM data.
- Show **live-ish** glucose values and **historical charts** (24h, 7d, 30d).
- Provide an **AI chat** (ChatGPT-compatible) that can answer questions grounded in the user’s CGM data.
- Clean, maintainable **React+TypeScript** code with organized hooks and components.

**Non‑Goals (for MVP)**
- HIPAA-compliant hosting, full audit logging, or clinician-facing features.
- Complex meal logging, insulin dosing advice, or predictive ML.
- Real-time push streams (polling is sufficient in MVP).


## 1) Tech Stack

**Frontend**
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui + lucide-react icons
- Data fetching: @tanstack/react-query
- Charts: **Recharts** (simple, responsive), plus date-fns for time
- Validation: zod

**Backend**
- Python **FastAPI**
- MongoDB (motor) for persistence
- Auth option (pick one):
  - **Supabase Auth** (hosted, email/OAuth) — verify JWT in FastAPI
  - or **Auth0 / Clerk** (standalone auth providers)
- Dexcom **Sandbox API** via OAuth2 Authorization Code flow (server-side exchange)
- OpenAI/ChatGPT API (or compatible) for the AI assistant

**Dev/Infra**
- Node 18+, Python 3.11+, MongoDB 6+
- Env management via `.env` (both frontend & backend)
- Simple background polling via APScheduler or FastAPI background tasks


## 2) High-Level Architecture

```
[Browser React App]
  ├─ Auth (Supabase/Auth0/Clerk)
  ├─ AI Chat UI
  ├─ Glucose Charts (Recharts)
  └─ React Query ->
         HTTPS (JWT)
              |
              v
        [FastAPI Backend]
          ├─ /auth/* (provider JWT verify)
          ├─ /dexcom/connect (redirect to Dexcom OAuth)
          ├─ /dexcom/callback (exchange code -> store tokens)
          ├─ /glucose (query Mongo, fallback to Dexcom)
          ├─ /chat (LLM answers grounded in user data)
          └─ background polls -> Dexcom Sandbox
                    |
                    v
               [MongoDB]
           users, tokens, readings, chats
```

MVP uses **polling** (e.g., every 5–10 min) to refresh readings; production can evolve to webhook/push if available.


## 3) Frontend App Structure

```
apps/web/
  ├─ src/
  │  ├─ main.tsx
  │  ├─ App.tsx
  │  ├─ routes/
  │  │  ├─ index.tsx           (dashboard: current glucose + 24h chart)
  │  │  ├─ trends.tsx          (7d/30d charts, day/night overlays)
  │  │  ├─ chat.tsx            (AI chat page)
  │  │  └─ settings.tsx        (connect Dexcom, tokens, profile)
  │  ├─ components/
  │  │  ├─ charts/
  │  │  │  └─ GlucoseLine.tsx  (Recharts LineChart wrapper)
  │  │  ├─ ChatBox.tsx
  │  │  ├─ Header.tsx / Sidebar.tsx
  │  │  └─ ui/ (shadcn generated components)
  │  ├─ hooks/
  │  │  ├─ useAuth.ts
  │  │  ├─ useDexcomConnect.ts
  │  │  ├─ useGlucoseQuery.ts
  │  │  ├─ useGlucosePolling.ts
  │  │  ├─ useChat.ts
  │  │  └─ useChartTheme.ts
  │  ├─ lib/
  │  │  ├─ api.ts              (axios base, interceptors)
  │  │  ├─ dates.ts            (date-fns utilities)
  │  │  └─ types.ts            (shared app types)
  │  ├─ store/                 (optional Zustand for local UI state)
  │  ├─ styles/
  │  │  └─ globals.css
  │  └─ env.d.ts
  └─ index.html
```

**Hook responsibilities (concise):**
- `useAuth()` — provider SDK integration, `user`, `token`, `signIn/Out`.
- `useDexcomConnect()` — start OAuth (hits backend `/dexcom/connect`), reading of connection status.
- `useGlucoseQuery({range})` — fetch readings from `/glucose?range=24h|7d|30d`, cached via React Query.
- `useGlucosePolling()` — lightweight polling toggle for dashboard freshness.
- `useChat()` — send messages to `/chat` and stream/append responses.
- `useChartTheme()` — shared chart colors, thresholds (low/high bands).


## 4) UI/UX Outline

**Pages**
- **Dashboard**: Current glucose, last update time, 24h line chart, min/avg/max, low/high badge.
- **Trends**: 7d/30d charts with toggles, range selector, time-in-range (TIR), daily overlays.
- **Chat**: Question input + conversation list; answers cite ranges, events (spikes/lows).
- **Settings**: Connect Dexcom (button), auth/profile, data export/delete.

**Components**
- `GlucoseLine` (Recharts): responsive line chart with dots on lows/highs, brush for 7d/30d.
- `StatCard` (shadcn `Card`): current glucose, TIR, min/max/avg.
- `ChatBox`: messages, streaming indicator, retry.
- `ConnectDexcomButton`: starts OAuth dance.

**Accessibility**
- High-contrast themes, focus styles, ARIA labels for charts.
- Keyboard navigation for chat and date pickers.


## 5) Data Models (MongoDB)

```ts
// users
{ _id: ObjectId, authUserId: string, email: string, createdAt, updatedAt }

// dexcom_tokens
{ _id: ObjectId, userId: ObjectId, accessToken: string, refreshToken: string, expiresAt: Date, scope: string[] }

// glucose_readings
{ _id, userId, ts: Date, mgdl: number, trend?: string }

// chat_sessions
{ _id, userId, title: string, createdAt }

// chat_messages
{ _id, sessionId, role: 'user'|'assistant'|'system', content: string, createdAt }
```

Indexes:
- `glucose_readings`: `{ userId: 1, ts: -1 }`
- `chat_messages`: `{ sessionId: 1, createdAt: 1 }`


## 6) Backend API (FastAPI)

**Environment (.env)**
```
MONGO_URI=...
DB_NAME=diabetes_mvp
JWT_JWKS_URL=...            # if Auth0/Clerk
SUPABASE_JWT_SECRET=...     # if Supabase Auth
DEXCOM_CLIENT_ID=...
DEXCOM_CLIENT_SECRET=...
DEXCOM_REDIRECT_URI=https://api.example.com/dexcom/callback
OPENAI_API_KEY=...
```

**Routes (MVP)**
- `GET  /health` — liveness
- `GET  /auth/me` — returns current user from JWT
- `GET  /dexcom/connect` — redirects to Dexcom Sandbox authorize URL
- `GET  /dexcom/callback?code=...` — exchanges code → stores tokens → redirects to app
- `GET  /glucose?range=24h|7d|30d` — reads from Mongo, may backfill via Dexcom
- `POST /chat` — `{message}` → responds with AI answer grounded in recent glucose

**Token handling**
- Store `access_token`, `refresh_token`, and `expires_at` per user.
- Auto-refresh on 401/expiry; persist refresh results.

**Polling job**
- Every 5–10 minutes: for each connected user, fetch last N minutes of CGM from Dexcom Sandbox and upsert readings.


## 7) Dexcom Sandbox (MVP Flow)

1. Developer registers app in Dexcom Developer Portal, **Sandbox** mode.
2. Configure OAuth **Authorization Code** flow with `DEXCOM_REDIRECT_URI`.
3. Frontend button → `GET /dexcom/connect` → backend builds authorize URL & redirects.
4. Dexcom redirects to `/dexcom/callback?code=...` → backend exchanges code for tokens.
5. Backend stores tokens, starts polling for CGM data, redirects user to the app.
6. Frontend charts read data from `/glucose?range=...` (React Query).

> Use the Sandbox test accounts provided by Dexcom for development. Check official docs for exact endpoints, scopes, and test credentials.


## 8) AI Chat (Grounded Answers)

**Prompting (server-side)**
- System prompt: “You are a CGM data assistant. Use only the user’s glucose data provided, avoid medical advice, be clear about limits.”
- Build **context**: fetch last 24h/7d stats for the user (TIR, lows, highs, mean, variability).
- **Answer shaping**: require citations of time windows (e.g., “Between 12:00–14:00 on Aug 19 the glucose rose from 95→190 mg/dL”).

**Safety**
- No dosing recommendations.
- Encourage discussing care decisions with a clinician.
- Refuse unrelated medical diagnosis.


## 9) Charts (Recharts)

- `LineChart` with `ResponsiveContainer`
- Axes: time (x), mg/dL (y); target band shading (e.g., 70–180 mg/dL).
- Tooltips show timestamp + mg/dL + trend arrow.
- Brush/zoom for 7d/30d.
- Theme from `useChartTheme()`; Tailwind CSS wraps layout.

**Install**
```
npm i recharts date-fns @tanstack/react-query axios zod lucide-react
```


## 10) Auth Recommendation (MVP)

- **Supabase Auth** is a good default: simple hosted email/password + OAuth providers, easy frontend SDK, and server-side JWT verification.
- Alternatives: **Auth0** or **Clerk** if you want enterprise SSO and management UI.

**Frontend**
- Use provider SDK to get `access_token` (JWT), store in memory.
- Send JWT as `Authorization: Bearer <token>` to FastAPI.

**Backend**
- Verify JWT on each request (`/auth/me`, `/glucose`, `/chat`).
- Map `authUserId` → internal `userId` in Mongo.


## 11) Development Setup

**Frontend**
```
npm create vite@latest app -- --template react-ts
cd app
npm i
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input textarea dialog badge
```

**Backend**
```
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install fastapi uvicorn[standard] python-dotenv pydantic-settings motor httpx apscheduler
```

**Run**
```
# frontend
npm run dev

# backend
uvicorn app.main:app --reload --port 8000
```


## 12) Testing Scenarios (MVP)

- Connect/disconnect Dexcom Sandbox user; verify token stored.
- Poll once; verify readings inserted (correct tz, duplicates handled).
- Dashboard renders 24h chart; values match DB; handles empty state.
- Chat answers reference recent data; refuses medical advice prompts.
- Auth: protected routes fail without JWT; succeed with valid JWT.


## 13) Potential Issues & Recommendations

1. **Regulatory/HIPAA**: If you handle real PHI, you’ll need HIPAA-compliant hosting, BAAs, encryption at rest, audit logs. MVP is **not** production for PHI.
2. **Timezones & DST**: Dexcom timestamps may be UTC; normalize and always show local time with clear labels.
3. **Token Refresh & Rate Limits**: Implement refresh and exponential backoff; log all HTTP failures.
4. **Data Gaps**: CGM sensors have warmup periods and gaps; the UI should annotate missing intervals.
5. **Grounding the AI**: Constrain the model to provided data; document limits; avoid recommendations.
6. **Scaling**: For real-time feel, increase polling frequency or add WebSocket/SSE. Cache recent readings in memory for quick loads.
7. **Security**: Never keep OpenAI keys in the client. Verify JWT on backend. Validate all params with zod/pydantic.
8. **Vendor Lock-in**: Keep the Dexcom integration behind a service class so it’s swappable.
9. **Offline/Errors**: React Query retries with user feedback; graceful fallbacks and toasts.
10. **Design System**: Use shadcn/ui for consistency; centralize chart theming in `useChartTheme()`.

---

## 14) Acceptance Criteria (MVP)

- User can sign in, connect Dexcom Sandbox, see **24h** glucose + min/avg/max.
- Trends page shows **7d** chart & **TIR%** for the period.
- AI chat answers questions grounded in the last **24h** and **7d**.
- All code organized via hooks/components as outlined.
- All secrets in `.env`; no keys in client bundle.

