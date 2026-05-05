import type { Severity } from "@/app/api";

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

type SeverityBadgeProps = {
  compact?: boolean;
  severity: Severity;
};

export function SeverityBadge({ compact = false, severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${STYLES[severity]}`}
    >
      {LABELS[severity]}
    </span>
  );
}

export default SeverityBadge;
