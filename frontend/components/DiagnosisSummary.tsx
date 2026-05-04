export function DiagnosisSummary({ summary }: { summary: string }) {
  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
        AI summary
      </p>
      <p className="mt-3 text-xl font-semibold leading-relaxed text-slate-950">
        {summary}
      </p>
    </section>
  );
}
