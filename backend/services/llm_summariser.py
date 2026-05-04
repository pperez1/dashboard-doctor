import json
import os

from anthropic import Anthropic
from sqlalchemy.orm import Session

from models import Incident, Metric


MODEL_NAME = "claude-sonnet-4-6"


def _fallback_summary(metric: Metric, check_results: list[dict]) -> str:
    failed = next((check for check in check_results if not check["passed"]), None)
    if not failed:
        return (
            f"{metric.name} has nothing to flag. The source table "
            f"{metric.source_table} is current and all diagnostic checks passed."
        )
    return (
        f"{metric.name} is flagged for {failed['check_name'].replace('_', ' ')}. "
        f"{failed['detail']} No other higher-priority issue was detected first."
    )


def get_or_create_summary(db: Session, incident: Incident) -> str:
    if incident.summary:
        return incident.summary

    metric = incident.metric
    check_results = [
        {
            "check_name": check.check_name,
            "passed": check.passed,
            "severity": check.severity,
            "detail": check.detail,
        }
        for check in incident.checks
    ]

    prompt = f"""You are a data quality assistant for a financial services operations team.
Given these diagnostic findings for a dashboard metric, write a 2-3 sentence
plain-language summary that an operations analyst can read in 10 seconds.
Lead with the root cause. Be specific about timing and table names.
Do not use jargon. Do not suggest fixes.

Metric: {metric.name}
Findings: {json.dumps(check_results)}
"""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        incident.summary = _fallback_summary(metric, check_results)
        db.commit()
        db.refresh(incident)
        return incident.summary

    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=180,
            messages=[{"role": "user", "content": prompt}],
        )
        text_blocks = [
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ]
        incident.summary = " ".join(text_blocks).strip() or _fallback_summary(
            metric, check_results
        )
    except Exception:
        incident.summary = _fallback_summary(metric, check_results)

    db.commit()
    db.refresh(incident)
    return incident.summary
