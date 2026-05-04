import Link from "next/link";

import { fetchHealthCheck } from "./api";
import { MetricRow } from "@/components/MetricRow";
import { ScenarioSwitcher } from "@/components/ScenarioSwitcher";

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export default async function DashboardPage() {
  const data = await fetchHealthCheck();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Dashboard Doctor
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Good morning — checked at {formatCheckedAt(data.checked_at)}
          </h1>
          <p className="mt-2 text-slate-600">{todayLabel()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/log"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
          >
            Incident log
          </Link>
          <ScenarioSwitcher />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-green-100 bg-green-50 p-6">
          <p className="text-sm font-medium text-green-700">Clear</p>
          <p className="mt-3 text-4xl font-bold text-green-800">OK {data.summary.green}</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-700">Review</p>
          <p className="mt-3 text-4xl font-bold text-amber-800">! {data.summary.amber}</p>
        </div>
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">Error</p>
          <p className="mt-3 text-4xl font-bold text-red-800">X {data.summary.red}</p>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Metric health</h2>
          <p className="text-sm text-slate-500">
            Flagged metrics appear first so analysts can triage the morning
            report quickly.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {data.metrics.map((metric) => (
            <MetricRow key={metric.metric_id} metric={metric} />
          ))}
        </div>
      </section>
    </main>
  );
}
