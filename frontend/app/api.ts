const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type Severity = "green" | "amber" | "red";
export type DecisionAction = "distribute" | "hold" | "escalate";

export type HealthMetric = {
  metric_id: string;
  name: string;
  source_table: string;
  severity: Severity;
  incident_id: string;
  headline: string;
};

export type HealthCheckResponse = {
  checked_at: string;
  summary: Record<Severity, number>;
  metrics: HealthMetric[];
};

export type LineageItem = {
  layer: string;
  name: string;
  status: string;
  last_ok: string;
};

export type CheckResult = {
  check_name: string;
  passed: boolean;
  severity: Severity;
  detail: string;
};

export type IncidentDecision = {
  action: DecisionAction;
  note: string;
  analyst: string;
  decided_at: string;
};

export type IncidentDetail = {
  id: string;
  metric_id: string;
  metric_name: string;
  source_table: string;
  severity: Severity;
  root_cause: string;
  summary: string;
  lineage: LineageItem[];
  checks: CheckResult[];
  status: string;
  detected_at: string;
  decision: IncidentDecision | null;
};

export type IncidentLogItem = {
  id: string;
  detected_at: string;
  metric_id?: string;
  metric_name: string;
  severity: Severity;
  root_cause: string;
  status: string;
  decision: DecisionAction | null;
  analyst: string | null;
};

export type ScenarioName = "red" | "amber" | "green";

type IncidentLogResponse = {
  page: number;
  page_size: number;
  total: number;
  incidents: IncidentLogItem[];
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      // Keep the HTTP status text when the API does not return JSON.
    }
    throw new Error(`Dashboard Doctor API request failed: ${message}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealthCheck() {
  return apiFetch<HealthCheckResponse>("/api/health-check");
}

export function fetchIncident(id: string) {
  return apiFetch<IncidentDetail>(`/api/incidents/${id}`);
}

export async function fetchIncidentLog(status: string = "open") {
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const response = await apiFetch<IncidentLogResponse>(`/api/incidents${query}`);
  return response.incidents;
}

export function postDecision(
  incidentId: string,
  payload: { action: DecisionAction; note: string; analyst: string },
) {
  return apiFetch<{ decision_id: string; incident_id: string; decided_at: string }>(
    `/api/incidents/${incidentId}/decision`,
    {
      body: JSON.stringify(payload),
      method: "POST",
    },
  );
}

export function loadScenario(name: ScenarioName) {
  return apiFetch<{ scenario: ScenarioName; created: number; summary: Record<Severity, number> }>(
    `/api/admin/load-scenario/${name}`,
    { method: "POST" },
  );
}

export function runChecksNow() {
  return apiFetch<{ created: number; checked_at: string }>("/api/admin/run-checks-now", {
    method: "POST",
  });
}
