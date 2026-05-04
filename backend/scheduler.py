from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from seed import run_checks


def nightly_job() -> None:
    db = SessionLocal()
    try:
        run_checks(db)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(nightly_job, "cron", hour=5, minute=0, id="nightly-dashboard-check")
    scheduler.start()
    return scheduler
