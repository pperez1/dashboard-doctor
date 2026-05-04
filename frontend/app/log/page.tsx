import Link from "next/link";

import { fetchIncidentLog } from "../api";
import { SeverityBadge } from "../../components/SeverityBadge";

type LogPageProps = {
  searchParams?: {
    status?: string;
  };
};

const filters = [
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: "all" },
];

export default async function LogPage({ searchParams }: LogPageProps) {
  const status = searchParams?.status ?? "open";
  const incidents = await fetchIncidentLog(status);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Incident audit log</h1>
          <p className="mt-2 text-slate-500">Decision history for morning dashboard distribution.</p>
        </div>
        <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={`/log?status=${filter.value}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                status === filter.value
                  ? "bg-slate-950 text-white"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Metric</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Root cause</th>
              <th className="px-6 py-4">Decision</th>
              <th className="px-6 py-4">Analyst</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-500">
                  {new Date(incident.detected_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/incidents/${incident.id}`} className="font-semibold text-slate-950 hover:underline">
                    {incident.metric_name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="px-6 py-4 capitalize text-slate-600">{incident.root_cause.replace("_", " ")}</td>
                <td className="px-6 py-4 capitalize text-slate-600">
                  {incident.decision ?? incident.status}
                </td>
                <td className="px-6 py-4 text-slate-600">{incident.analyst ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {incidents.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">No incidents match this filter.</div>
        ) : null}
      </div>
    </main>
  );
}
