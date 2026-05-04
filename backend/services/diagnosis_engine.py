from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable


Severity = str


@dataclass
class DiagnosticCheck:
    check_name: str
    passed: bool
    severity: Severity
    detail: str


def _parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _format_utc(value: str) -> str:
    return _parse_utc(value).strftime("%H:%M UTC")


def check_data_freshness(metric: dict[str, Any]) -> DiagnosticCheck:
    state = metric["mock_state"]
    last_refreshed = _parse_utc(state["last_refreshed"])
    expected_by = _parse_utc(state["expected_refresh_by"])

    if last_refreshed < expected_by:
        hours_late = (expected_by - last_refreshed).total_seconds() / 3600
        return DiagnosticCheck(
            check_name="freshness",
            passed=False,
            severity="red",
            detail=(
                f"Last refresh {_format_utc(state['last_refreshed'])}, expected by "
                f"{_format_utc(state['expected_refresh_by'])}; data is {hours_late:.1f}h behind the morning cutoff"
            ),
        )

    return DiagnosticCheck(
        check_name="freshness",
        passed=True,
        severity="green",
        detail=(
            f"Last refresh {_format_utc(state['last_refreshed'])}, expected by "
            f"{_format_utc(state['expected_refresh_by'])}"
        ),
    )


def check_pipeline_job(metric: dict[str, Any]) -> DiagnosticCheck:
    status = metric["mock_state"]["etl_job_status"]
    if status != "success":
        return DiagnosticCheck(
            check_name="job_failure",
            passed=False,
            severity="red",
            detail=f"Upstream ETL job reported {status}",
        )

    return DiagnosticCheck(
        check_name="job_failure",
        passed=True,
        severity="green",
        detail="All ETL jobs completed successfully",
    )


def check_row_count_drift(metric: dict[str, Any]) -> DiagnosticCheck:
    state = metric["mock_state"]
    today = int(state["row_count_today"])
    yesterday = int(state["row_count_yesterday"])
    threshold = float(metric.get("alert_threshold_pct", 10.0))
    pct_change = 0.0 if yesterday == 0 else ((today - yesterday) / yesterday) * 100

    if abs(pct_change) > threshold:
        direction = "drop" if pct_change < 0 else "increase"
        return DiagnosticCheck(
            check_name="row_count",
            passed=False,
            severity="amber",
            detail=(
                f"Row count {direction} of {abs(pct_change):.1f}% "
                f"({today:,} today vs {yesterday:,} yesterday), above the {threshold:.1f}% alert threshold"
            ),
        )

    return DiagnosticCheck(
        check_name="row_count",
        passed=True,
        severity="green",
        detail=f"Row count changed {pct_change:+.1f}% ({today:,} today vs {yesterday:,} yesterday)",
    )


def check_schema_integrity(metric: dict[str, Any]) -> DiagnosticCheck:
    state = metric["mock_state"]
    expected_columns = state.get("expected_columns")
    actual_columns = state.get("actual_columns")
    changed = bool(state.get("schema_changed", False))
    if expected_columns is not None and actual_columns is not None:
        changed = expected_columns != actual_columns
    if changed:
        return DiagnosticCheck(
            check_name="schema",
            passed=False,
            severity="red",
            detail=f"Schema changed for {metric['source_table']}",
        )

    return DiagnosticCheck(
        check_name="schema",
        passed=True,
        severity="green",
        detail=f"No column changes detected for {metric['source_table']}",
    )


def check_report_logic(metric: dict[str, Any]) -> DiagnosticCheck:
    valid = bool(metric["mock_state"]["report_logic_valid"])
    if not valid:
        return DiagnosticCheck(
            check_name="logic",
            passed=False,
            severity="red",
            detail="Dashboard query does not match its expected definition",
        )

    return DiagnosticCheck(
        check_name="logic",
        passed=True,
        severity="green",
        detail="Dashboard query matches its expected definition",
    )


CHECKS: list[Callable[[dict[str, Any]], DiagnosticCheck]] = [
    check_data_freshness,
    check_pipeline_job,
    check_row_count_drift,
    check_schema_integrity,
    check_report_logic,
]
CHECK_ORDER = ["freshness", "job_failure", "row_count", "schema", "logic"]


def run_diagnostics(metric: dict[str, Any]) -> list[DiagnosticCheck]:
    results: list[DiagnosticCheck] = []
    for check in CHECKS:
        result = check(metric)
        results.append(result)
        if result.severity == "red":
            break
    return results


def incident_severity(results: list[DiagnosticCheck]) -> Severity:
    if any(result.severity == "red" for result in results):
        return "red"
    if any(result.severity == "amber" for result in results):
        return "amber"
    return "green"


def root_cause(results: list[DiagnosticCheck]) -> str:
    first_failure = next((result for result in results if not result.passed), None)
    if not first_failure:
        return "none"
    if first_failure.check_name == "row_count":
        return "drift"
    return first_failure.check_name


def headline_for(metric: dict[str, Any], results: list[DiagnosticCheck]) -> str:
    failure = next((result for result in results if not result.passed), None)
    if not failure:
        return "All checks passed"
    if failure.check_name == "freshness":
        state = metric["mock_state"]
        lag = (_parse_utc(state["expected_refresh_by"]) - _parse_utc(state["last_refreshed"])).total_seconds() / 3600
        return f"Data sync completed {lag:.1f}h late"
    if failure.check_name == "row_count":
        return "Row count moved beyond threshold"
    if failure.check_name == "job_failure":
        return "Upstream job failed"
    if failure.check_name == "schema":
        return "Source schema changed"
    return "Report logic mismatch"
