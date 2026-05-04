"use client";

import { FormEvent, useState } from "react";

import { postDecision } from "@/app/api";

type Props = {
  incidentId: string;
  locked: boolean;
  existingDecision?: {
    action: string;
    analyst: string;
    decided_at: string;
  } | null;
};

const actions = [
  { id: "distribute", label: "Distribute" },
  { id: "hold", label: "Hold" },
  { id: "escalate", label: "Escalate" },
];

export default function DecisionPanel({
  incidentId,
  locked,
  existingDecision,
}: Props) {
  const [action, setAction] = useState("hold");
  const [note, setNote] = useState("");
  const [analyst, setAnalyst] = useState("");
  const [submitted, setSubmitted] = useState(existingDecision ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLocked = locked || Boolean(submitted);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await postDecision(incidentId, {
        action,
        note,
        analyst: analyst || "ops.analyst",
      });
      setSubmitted({
        action,
        analyst: analyst || "ops.analyst",
        decided_at: result.decided_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save decision");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLocked) {
    const decision = submitted ?? existingDecision;
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Decision logged</h2>
        <p className="mt-3 text-sm text-slate-600">
          This incident was marked{" "}
          <span className="font-semibold capitalize text-slate-950">
            {decision?.action}
          </span>{" "}
          by {decision?.analyst} at{" "}
          {decision ? new Date(decision.decided_at).toLocaleString() : "now"}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Decision panel</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose whether morning reports can move forward.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((option) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                action === option.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              key={option.id}
              onClick={() => setAction(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Analyst
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            onChange={(event) => setAnalyst(event.target.value)}
            placeholder="s.jones"
            value={analyst}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Note
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Waiting for custody sync to complete"
            value={note}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Log decision"}
        </button>
      </form>
    </section>
  );
}
