import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchIncident } from "../../api";
import DecisionPanel from "../../../components/DecisionPanel";
import { DiagnosisSummary } from "../../../components/DiagnosisSummary";
import { LineageTimeline } from "../../../components/LineageTimeline";
import { SeverityBadge } from "../../../components/SeverityBadge";

const checkLabels: Record<string, string> = {
  freshness: "Data freshness",
  job_failure: "Pipeline job",
  row_count: "Row count drift",
  schema: "Schema integrity",
  logic: "Report logic",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  let incident;
  try {
    incident = await fetchIncident(params.id);
  } catch (error) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-8">
      <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        Back to dashboard
      </Link>

      <div className="mt-6 flex items-start justify-between gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Diagnosis</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-950">{incident.metric_name}</h1>
          <p className="mt-3 text-sm text-slate-500">
            Detected {formatDate(incident.detected_at)} · Root cause: {incident.root_cause.replace("_", " ")}
          </p>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <DiagnosisSummary summary={incident.summary} />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Check results</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {incident.checks.map((check) => (
                <details key={check.check_name} className="group py-4" open={check.severity !== "green"}>
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="font-medium text-slate-900">
                      {check.passed ? "Pass" : "Review"} · {checkLabels[check.check_name] ?? check.check_name}
                    </span>
                    <SeverityBadge severity={check.severity} compact />
                  </summary>
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{check.detail}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <LineageTimeline lineage={incident.lineage} />
          <DecisionPanel
            existingDecision={incident.decision}
            incidentId={incident.id}
            locked={incident.status !== "open"}
          />
        </div>
      </div>
    </main>
  );
}
