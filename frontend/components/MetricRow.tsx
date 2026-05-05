import Link from "next/link";
import type { Severity } from "@/app/api";
import { SeverityBadge } from "./SeverityBadge";

type MetricRowProps = {
  metric: {
    metric_id: string;
    name: string;
    source_table: string;
    severity: Severity;
    incident_id: string;
    headline: string;
  };
};

export function MetricRow({ metric }: MetricRowProps) {
  return (
    <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1.4fr_auto] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0">
      <div>
        <p className="font-semibold text-slate-950">{metric.name}</p>
        <p className="text-sm text-slate-500">{metric.metric_id}</p>
      </div>
      <code className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700">{metric.source_table}</code>
      <SeverityBadge severity={metric.severity} />
      <p className="text-sm text-slate-600">{metric.headline}</p>
      <Link
        href={`/incidents/${metric.incident_id}`}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        View diagnosis
      </Link>
    </div>
  );
}

export default MetricRow;
