import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from models import CheckResult, Decision, Incident, Metric
from services.connector_service import activate_scenario, load_active_metrics
from services.diagnosis_engine import (
    CHECK_ORDER,
    incident_severity,
    root_cause,
    run_diagnostics,
)
from services.llm_summariser import get_or_create_summary


DEMO_CHECKED_AT = datetime(2026, 5, 3, 5, 0, 14, tzinfo=timezone.utc)


def seed_metrics(db: Session, metrics: list[dict] | None = None) -> None:
    metrics = metrics or load_active_metrics()
    for item in metrics:
        metric = db.get(Metric, item["id"])
        values = {
            "name": item["name"],
            "source_table": item["source_table"],
            "expected_refresh_cron": item["expected_refresh_cron"],
            "alert_threshold_pct": item.get("alert_threshold_pct", 10.0),
            "is_active": item.get("is_active", True),
        }
        if metric:
            for key, value in values.items():
                setattr(metric, key, value)
        else:
            db.add(Metric(id=item["id"], **values))
    db.commit()


def reset_incidents(db: Session) -> None:
    db.query(Decision).delete()
    db.query(CheckResult).delete()
    db.query(Incident).delete()
    db.commit()


def run_checks(
    db: Session,
    metric_id: str | None = None,
    detected_at: datetime | None = None,
) -> list[Incident]:
    fixture_metrics = load_active_metrics()
    if metric_id:
        fixture_metrics = [metric for metric in fixture_metrics if metric["id"] == metric_id]
    seed_metrics(db, fixture_metrics)

    detected_at = detected_at or datetime.now(timezone.utc)
    incidents: list[Incident] = []
    for metric_fixture in fixture_metrics:
        results = run_diagnostics(metric_fixture)
        severity = incident_severity(results)
        incident = Incident(
            id=f"inc_{uuid4().hex[:8]}",
            metric_id=metric_fixture["id"],
            detected_at=detected_at,
            severity=severity,
            root_cause=root_cause(results),
            lineage_json=json.dumps(metric_fixture["mock_state"].get("lineage", [])),
            status="open",
        )
        db.add(incident)
        db.flush()
        for index, result in enumerate(results):
            db.add(
                CheckResult(
                    id=f"chk_{uuid4().hex[:8]}",
                    incident_id=incident.id,
                    check_name=result.check_name,
                    passed=result.passed,
                    severity=result.severity,
                    detail=result.detail,
                    order_index=CHECK_ORDER.index(result.check_name)
                    if result.check_name in CHECK_ORDER
                    else index,
                )
            )
        incidents.append(incident)

    db.commit()
    for incident in incidents:
        db.refresh(incident)
        get_or_create_summary(db, incident)
    return incidents


def load_scenario(db: Session, name: str) -> list[Incident]:
    metrics = activate_scenario(name)
    seed_metrics(db, metrics)
    reset_incidents(db)
    return run_checks(db, detected_at=DEMO_CHECKED_AT)
