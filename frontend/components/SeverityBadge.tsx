export type Severity = "green" | "amber" | "red";

const STYLES: Record<Severity, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
};

const LABELS: Record<Severity, string> = {
  green: "Clear",
  amber: "Review",
  red: "Error",
};

export function SeverityBadge({
  compact = false,
  severity,
}: {
  compact?: boolean;
  severity: Severity;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border text-xs font-semibold uppercase tracking-wide ${compact ? "px-2 py-0.5" : "px-3 py-1"} ${STYLES[severity]}`}
    >
      {LABELS[severity]}
    </span>
  );
}

export default SeverityBadge;
