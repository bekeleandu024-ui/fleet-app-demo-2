"use client";

import { useState, useTransition } from "react";

import type { DelayNotificationDraft } from "@/server/trip-risk";

type Props = {
  tripId: string;
  draftAction: (tripId: string) => Promise<DelayNotificationDraft>;
};

export function DelayNotificationCard({ tripId, draftAction }: Props) {
  const [pending, startDraft] = useTransition();
  const [draft, setDraft] = useState<DelayNotificationDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-sm text-amber-100">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Delay notification</h3>
          <p className="text-xs text-amber-200">Generate customer update with revised ETA</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startDraft(async () => {
              try {
                const result = await draftAction(tripId);
                setDraft(result);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to draft notification");
              }
            });
          }}
          className="rounded-lg border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/10 disabled:opacity-60"
        >
          {pending ? "Preparing…" : "Draft update"}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-amber-200">{error}</p>}
      {draft && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200">Subject</p>
            <p className="text-sm text-amber-100">{draft.subject}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200">Body</p>
            <pre className="whitespace-pre-wrap text-sm text-amber-100">{draft.body}</pre>
          </div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-amber-200">
            {draft.summary.actions.map((action) => (
              <span key={action.label} className="rounded-full border border-amber-400/40 px-3 py-1">
                {action.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
