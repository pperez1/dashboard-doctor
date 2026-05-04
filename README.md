# Dashboard Doctor

A fixture-driven diagnostic web app for morning dashboard quality checks.

## Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
ANTHROPIC_API_KEY=... uvicorn main:app --reload
```

The API seeds the green scenario on startup. Demo scenario controls are also
available directly:

- `POST /api/admin/load-scenario/red`
- `POST /api/admin/load-scenario/amber`
- `POST /api/admin/load-scenario/green`
- `POST /api/admin/run-checks-now`

If `ANTHROPIC_API_KEY` is not set, the backend stores a deterministic fallback
summary so the demo can still run offline. With the key present, summaries are
generated once with `claude-sonnet-4-6` and cached on the incident.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` if the FastAPI backend is not running at
`http://localhost:8000`.
