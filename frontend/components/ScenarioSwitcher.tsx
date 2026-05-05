"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadScenario, runChecksNow } from "@/app/api";

const SCENARIOS = ["red", "amber", "green"] as const;

export function ScenarioSwitcher() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleScenario(name: (typeof SCENARIOS)[number]) {
    setLoading(name);
    setMessage("");
    setError("");
    try {
      await loadScenario(name);
      setMessage(`${name[0].toUpperCase()}${name.slice(1)} scenario loaded.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load scenario");
    } finally {
      setLoading(null);
    }
  }

  async function handleRunChecks() {
    setLoading("checks");
    setMessage("");
    setError("");
    try {
      await runChecksNow();
      setMessage("Checks re-run.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run checks");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Demo controls</p>
          <p className="text-xs text-slate-500">
            Swap fixtures and re-run diagnostics without touching the database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario}
              onClick={() => handleScenario(scenario)}
              disabled={loading !== null}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold capitalize text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading === scenario ? "Loading..." : scenario}
            </button>
          ))}
          <button
            onClick={handleRunChecks}
            disabled={loading !== null}
            className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading === "checks" ? "Running..." : "Run checks now"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-xs text-slate-500">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

export default ScenarioSwitcher;
