// Acceptance criteria:
// - Lists existing rules with key, scope, value, note.
// - Provides inline form to upsert rules using server action.
// - After submission, page refreshes with updated data.

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

const upsertRuleAction = async (formData: FormData) => {
  "use server";
  const id = formData.get("id");
  const ruleKey = formData.get("ruleKey");
  const scope = formData.get("scope");
  const value = formData.get("value");
  const note = formData.get("note");
  if (typeof ruleKey !== "string" || !ruleKey.trim()) {
    throw new Error("Rule key required");
  }
  if (typeof scope !== "string" || !scope.trim()) {
    throw new Error("Scope required");
  }
  if (typeof id === "string" && id) {
    await prisma.rule.update({
      where: { id },
      data: {
        ruleKey: ruleKey.trim(),
        scope: scope.trim(),
        value: typeof value === "string" ? value.trim() : "",
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      },
    });
  } else {
    await prisma.rule.create({
      data: {
        ruleKey: ruleKey.trim(),
        scope: scope.trim(),
        value: typeof value === "string" ? value.trim() : "",
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      },
    });
  }
  revalidatePath("/admin/rules");
};

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <h1 className="text-2xl font-semibold text-white">Business rules</h1>
        <p className="text-sm text-zinc-400">Manage SLA, guardrails, and lane policies</p>
      </div>

      <form action={upsertRuleAction} className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-sm">
        <div className="grid gap-1 md:grid-cols-4 md:gap-3">
          <input type="hidden" name="id" />
          <div className="grid gap-1">
            <label htmlFor="ruleKey" className="text-xs uppercase tracking-wide text-zinc-400">
              Rule key
            </label>
            <input id="ruleKey" name="ruleKey" required className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="scope" className="text-xs uppercase tracking-wide text-zinc-400">
              Scope
            </label>
            <input id="scope" name="scope" required className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="value" className="text-xs uppercase tracking-wide text-zinc-400">
              Value
            </label>
            <input id="value" name="value" className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="note" className="text-xs uppercase tracking-wide text-zinc-400">
              Note
            </label>
            <input id="note" name="note" className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white" />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/30"
          >
            Save rule
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left">Key</th>
              <th className="px-4 py-2 text-left">Scope</th>
              <th className="px-4 py-2 text-left">Value</th>
              <th className="px-4 py-2 text-left">Note</th>
              <th className="px-4 py-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-2 text-white">{rule.ruleKey}</td>
                <td className="px-4 py-2 text-zinc-300">{rule.scope}</td>
                <td className="px-4 py-2 text-zinc-300">{rule.value}</td>
                <td className="px-4 py-2 text-zinc-400">{rule.note ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-400">{rule.updatedAt.toLocaleString()}</td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No rules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
