import json
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import CheckResult, Decision, Incident, Metric
from seed import load_scenario, run_checks
from services.diagnosis_engine import CHECK_ORDER
from services.llm_summariser import get_or_create_summary


router = APIRouter(prefix="/api")


class DecisionRequest(BaseModel):
    action: Literal["distribute", "hold", "escalate"]
    note: str = ""
    analyst: str = Field(min_length=1)


def utc_iso(value: datetime) -> str:
    return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def latest_incident_subquery(db: Session):
    return (
        db.query(
            Incident.metric_id,
            func.max(Incident.detected_at).label("latest_detected_at"),
        )
        .group_by(Incident.metric_id)
        .subquery()
    )


def headline_for(incident: Incident) -> str:
    failed_check = next((check for check in incident.checks if not check.passed), None)
    if failed_check:
        return failed_check.detail
    return "All diagnostic checks passed"


@router.get("/health-check")
def get_health_check(db: Session = Depends(get_db)):
    subq = latest_incident_subquery(db)
    rows = (
        db.query(Metric, Incident)
        .join(subq, Metric.id == subq.c.metric_id)
        .join(
            Incident,
            (Incident.metric_id == subq.c.metric_id)
            & (Incident.detected_at == subq.c.latest_detected_at),
        )
        .filter(Metric.is_active.is_(True))
        .all()
    )
    severity_rank = {"red": 0, "amber": 1, "green": 2}
    rows.sort(key=lambda row: (severity_rank.get(row[1].severity, 9), row[0].name))
    summary = {"green": 0, "amber": 0, "red": 0}
    checked_at = max((incident.detected_at for _, incident in rows), default=datetime.now(timezone.utc))
    metrics = []
    for metric, incident in rows:
        summary[incident.severity] += 1
        metrics.append(
            {
                "metric_id": metric.id,
                "name": metric.name,
                "source_table": metric.source_table,
                "severity": incident.severity,
                "incident_id": incident.id,
                "headline": headline_for(incident),
            }
        )
    return {
        "checked_at": utc_iso(checked_at),
        "summary": summary,
        "metrics": metrics,
    }


@router.get("/incidents/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not incident.summary:
        get_or_create_summary(db, incident)
    latest_decision = incident.decisions[-1] if incident.decisions else None
    return {
        "id": incident.id,
        "metric_id": incident.metric_id,
        "metric_name": incident.metric.name,
        "source_table": incident.metric.source_table,
        "severity": incident.severity,
        "root_cause": incident.root_cause,
        "summary": incident.summary,
        "lineage": json.loads(incident.lineage_json),
        "checks": [
            {
                "check_name": check.check_name,
                "passed": check.passed,
                "severity": check.severity,
                "detail": check.detail,
            }
            for check in sorted(incident.checks, key=lambda check: CHECK_ORDER.index(check.check_name))
        ],
        "status": incident.status,
        "detected_at": utc_iso(incident.detected_at),
        "decision": {
            "action": latest_decision.action,
            "note": latest_decision.note,
            "analyst": latest_decision.analyst,
            "decided_at": utc_iso(latest_decision.decided_at),
        }
        if latest_decision
        else None,
    }


@router.post("/incidents/{incident_id}/decision", status_code=status.HTTP_201_CREATED)
def create_decision(
    incident_id: str,
    payload: DecisionRequest,
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    status_by_action = {
        "distribute": "distributed",
        "hold": "held",
        "escalate": "escalated",
    }
    decision = Decision(
        id=f"dec_{uuid4().hex[:8]}",
        incident_id=incident.id,
        action=payload.action,
        note=payload.note,
        analyst=payload.analyst,
        decided_at=datetime.now(timezone.utc),
    )
    incident.status = status_by_action[payload.action]
    db.add(decision)
    db.commit()
    return {
        "decision_id": decision.id,
        "incident_id": incident.id,
        "decided_at": utc_iso(decision.decided_at),
    }


@router.post("/incidents/{incident_id}/trigger-diagnosis")
def trigger_diagnosis(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    new_incident = run_checks(db, metric_id=incident.metric_id)[0]
    return {"incident_id": new_incident.id, "severity": new_incident.severity}


@router.get("/incidents")
def list_incidents(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Incident).join(Metric).order_by(Incident.detected_at.desc())
    if status_filter == "resolved":
        query = query.filter(Incident.status != "open")
    elif status_filter:
        query = query.filter(Incident.status == status_filter)
    total = query.count()
    incidents = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "incidents": [
            {
                "id": incident.id,
                "metric_id": incident.metric_id,
                "metric_name": incident.metric.name,
                "severity": incident.severity,
                "root_cause": incident.root_cause,
                "status": incident.status,
                "detected_at": utc_iso(incident.detected_at),
                "decision": incident.decisions[-1].action if incident.decisions else None,
                "analyst": incident.decisions[-1].analyst if incident.decisions else None,
            }
            for incident in incidents
        ],
    }


@router.post("/admin/run-checks-now")
def run_checks_now(db: Session = Depends(get_db)):
    incidents = run_checks(db)
    return {
        "created": len(incidents),
        "checked_at": utc_iso(max(incident.detected_at for incident in incidents)),
    }


@router.post("/admin/load-scenario/{name}")
def load_named_scenario(name: Literal["red", "amber", "green"], db: Session = Depends(get_db)):
    incidents = load_scenario(db, name)
    return {
        "scenario": name,
        "created": len(incidents),
        "summary": {
            "green": sum(1 for incident in incidents if incident.severity == "green"),
            "amber": sum(1 for incident in incidents if incident.severity == "amber"),
            "red": sum(1 for incident in incidents if incident.severity == "red"),
        },
    }
