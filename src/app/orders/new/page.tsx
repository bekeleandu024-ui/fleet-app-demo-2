// Acceptance criteria:
// - Page renders OCR workspace with manual form and rule check panel.
// - Analyze and email draft buttons call server actions and render results.
// - Submit posts to /api/orders and redirects to plan page on success.
// - Users can apply parsed fields and copy OCR raw text.

import Link from "next/link";

import { OrderIntakeWorkspace } from "./order-intake-workspace";
import { analyzeOrderForIssues, draftInfoRequestEmail } from "@/server/analyze-order";

export const dynamic = "force-dynamic";

const analyzeAction = async (input: Parameters<typeof analyzeOrderForIssues>[0]) => {
  "use server";
  return analyzeOrderForIssues(input);
};

const draftEmailAction = async (input: Parameters<typeof draftInfoRequestEmail>[0]) => {
  "use server";
  return draftInfoRequestEmail(input);
};

export default function NewOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/orders" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to orders
        </Link>
      </div>
      <OrderIntakeWorkspace analyzeAction={analyzeAction} draftEmailAction={draftEmailAction} />
    </div>
  );
}
