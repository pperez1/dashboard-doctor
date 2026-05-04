const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type Severity = "green" | "amber" | "red";

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
  decision: {
    action: string;
    note: string;
    analyst: string;
    decided_at: string;
  } | null;
};

export type IncidentLogItem = {
  id: string;
  detected_at: string;
  metric_name: string;
  severity: Severity;
  root_cause: string;
  status: string;
  decision: string | null;
  analyst: string | null;
};

type IncidentLogResponse = {
  incidents: IncidentLogItem[];
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealthCheck() {
  return apiFetch<HealthCheckResponse>("/api/health-check");
}

export function fetchIncident(id: string) {
  return apiFetch<IncidentDetail>(`/api/incidents/${id}`);
}

export async function fetchIncidentLog(status: string) {
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const response = await apiFetch<IncidentLogResponse>(`/api/incidents${query}`);
  return response.incidents;
}

export function postDecision(
  incidentId: string,
  payload: { action: string; note: string; analyst: string },
) {
  return apiFetch<{ decision_id: string; incident_id: string; decided_at: string }>(
    `/api/incidents/${incidentId}/decision`,
    {
      body: JSON.stringify(payload),
      method: "POST",
    },
  );
}

export function loadScenario(name: "red" | "amber" | "green") {
  return apiFetch(`/api/admin/load-scenario/${name}`, { method: "POST" });
}

export function runChecksNow() {
  return apiFetch("/api/admin/run-checks-now", { method: "POST" });
}
