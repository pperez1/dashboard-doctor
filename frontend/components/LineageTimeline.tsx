type LineageItem = {
  layer: string;
  name: string;
  status: string;
  last_ok: string;
};

const dotClasses: Record<string, string> = {
  ok: "bg-emerald-500",
  delayed: "bg-red-500",
  stale: "bg-red-500",
  warning: "bg-amber-500",
  changed: "bg-amber-500",
  failed: "bg-red-500",
};

export function LineageTimeline({ lineage }: { lineage: LineageItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Lineage timeline</h2>
      <div className="mt-5 space-y-0">
        {lineage.map((item, index) => (
          <div className="relative flex gap-4 pb-7 last:pb-0" key={`${item.layer}-${item.name}`}>
            {index < lineage.length - 1 ? (
              <div className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />
            ) : null}
            <div
              className={`relative z-10 mt-1 h-5 w-5 rounded-full border-4 border-white shadow ${
                dotClasses[item.status] ?? "bg-slate-400"
              }`}
            />
            <div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-slate-950">{item.layer}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                Last refreshed {new Date(item.last_ok).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
