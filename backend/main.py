from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from database import SessionLocal, init_db
from scheduler import start_scheduler
from seed import load_scenario


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        load_scenario(db, "green")
    finally:
        db.close()
    scheduler = start_scheduler()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Dashboard Doctor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Dashboard Doctor", "status": "ok"}
