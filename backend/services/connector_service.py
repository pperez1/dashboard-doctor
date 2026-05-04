import json
from pathlib import Path
from typing import Any


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
ACTIVE_SCENARIO_FILE = FIXTURE_DIR / "active_scenario.json"
SCENARIOS = {
    "red": FIXTURE_DIR / "scenario_red.json",
    "amber": FIXTURE_DIR / "scenario_amber.json",
    "green": FIXTURE_DIR / "scenario_green.json",
}


def read_json_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_active_fixture_path() -> Path:
    return ACTIVE_SCENARIO_FILE if ACTIVE_SCENARIO_FILE.exists() else FIXTURE_DIR / "metrics.json"


def load_active_metrics() -> list[dict[str, Any]]:
    return read_json_file(get_active_fixture_path())


def load_metric_state(metric_id: str) -> dict[str, Any]:
    for metric in load_active_metrics():
        if metric["id"] == metric_id:
            return metric
    raise KeyError(f"Unknown metric fixture: {metric_id}")


def activate_scenario(name: str) -> list[dict[str, Any]]:
    scenario_path = SCENARIOS.get(name)
    if not scenario_path:
        raise ValueError(f"Unknown scenario '{name}'. Expected one of: {', '.join(SCENARIOS)}")

    metrics = read_json_file(scenario_path)
    ACTIVE_SCENARIO_FILE.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics
