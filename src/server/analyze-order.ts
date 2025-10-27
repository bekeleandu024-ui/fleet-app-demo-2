import prisma from "@/lib/prisma";

export type DraftOrderInput = {
  orderId?: string;
  customer?: string;
  origin?: string;
  destination?: string;
  puWindowStart?: string | Date | null;
  puWindowEnd?: string | Date | null;
  delWindowStart?: string | Date | null;
  delWindowEnd?: string | Date | null;
  requiredTruck?: string | null;
  notes?: string | null;
};

export type SuggestionAction = {
  label: string;
  action: "APPLY" | "DISMISS" | "ADJUST";
};

export type SuggestionSummary = {
  textSummary: string;
  why: string[];
  actions: SuggestionAction[];
};

export type AnalysisResult = {
  missingFields: string[];
  slaWarnings: string[];
  blacklistHits: string[];
  borderWarnings: string[];
  nextStep: string;
  summary: SuggestionSummary;
};

function normalize(value?: string | null) {
  return value?.trim() || undefined;
}

function toDate(value?: string | Date | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

async function getRules(ruleKeys: string[], scopes: string[]) {
  if (!ruleKeys.length) return [] as Array<{ ruleKey: string; scope: string; value: string; note: string | null }>;
  const result = await prisma.rule.findMany({
    where: {
      ruleKey: { in: ruleKeys },
      scope: { in: scopes },
    },
  });
  return result;
}

function buildScopes(draft: DraftOrderInput) {
  const scopes = new Set<string>(["GLOBAL"]);
  const customer = normalize(draft.customer);
  const origin = normalize(draft.origin)?.toUpperCase();
  const destination = normalize(draft.destination)?.toUpperCase();

  if (customer) {
    scopes.add(`CUSTOMER:${customer.toUpperCase()}`);
  }
  if (origin) {
    scopes.add(`ORIGIN:${origin}`);
  }
  if (destination) {
    scopes.add(`DEST:${destination}`);
  }
  if (origin && destination) {
    scopes.add(`LANE:${origin}->${destination}`);
  }

  return Array.from(scopes);
}

function detectCrossBorder(origin?: string, destination?: string) {
  if (!origin || !destination) return false;
  const canadianKeywords = [/ontario/i, /toronto/i, /canada/i, /qc/i];
  const usKeywords = [/michigan/i, /usa/i, /detroit/i, /ny/i, /ohio/i];
  const isCanadian = canadianKeywords.some((regex) => regex.test(origin) || regex.test(destination));
  const isUS = usKeywords.some((regex) => regex.test(origin) || regex.test(destination));
  return isCanadian && isUS;
}

export async function analyzeOrderForIssues(draft: DraftOrderInput): Promise<AnalysisResult> {
  const missingFields: string[] = [];
  const slaWarnings: string[] = [];
  const blacklistHits: string[] = [];
  const borderWarnings: string[] = [];

  if (!normalize(draft.customer)) missingFields.push("customer");
  if (!normalize(draft.origin)) missingFields.push("origin");
  if (!normalize(draft.destination)) missingFields.push("destination");

  const pickupStart = toDate(draft.puWindowStart);
  const pickupEnd = toDate(draft.puWindowEnd);
  const deliveryStart = toDate(draft.delWindowStart);
  const deliveryEnd = toDate(draft.delWindowEnd);

  if (pickupStart && pickupEnd && pickupStart > pickupEnd) {
    slaWarnings.push("Pickup window start is after end");
  }
  if (deliveryStart && deliveryEnd && deliveryStart > deliveryEnd) {
    slaWarnings.push("Delivery window start is after end");
  }
  if (!pickupEnd) missingFields.push("pickup window end");
  if (!deliveryEnd) missingFields.push("delivery window end");

  const scopes = buildScopes(draft);
  const rules = await getRules(
    [
      "SLA_DELIVERY_WINDOW",
      "BLACKLIST_LANE",
      "BORDER_DOC_REQUIRED",
      "CUSTOMER_SLA",
      "LANE_NOTES",
    ],
    scopes
  );

  for (const rule of rules) {
    if (rule.ruleKey === "BLACKLIST_LANE") {
      blacklistHits.push(rule.note ?? rule.value);
    }
    if (rule.ruleKey === "SLA_DELIVERY_WINDOW" || rule.ruleKey === "CUSTOMER_SLA") {
      slaWarnings.push(rule.note ?? rule.value);
    }
    if (rule.ruleKey === "BORDER_DOC_REQUIRED") {
      borderWarnings.push(rule.note ?? rule.value);
    }
    if (rule.ruleKey === "LANE_NOTES") {
      slaWarnings.push(rule.note ?? rule.value);
    }
  }

  if (detectCrossBorder(draft.origin, draft.destination)) {
    borderWarnings.push("Cross-border lane detected – ensure FAST driver and ACE manifest");
  }

  const allWarnings = [...slaWarnings, ...blacklistHits, ...borderWarnings];
  const readyToPrice = missingFields.length === 0 && blacklistHits.length === 0;
  const nextStep = readyToPrice
    ? "All info present — ready to price"
    : missingFields.includes("delivery window end")
    ? "Missing delivery window; draft email?"
    : "Review flagged warnings before pricing";

  const summary: SuggestionSummary = {
    textSummary: readyToPrice
      ? "Order draft looks complete"
      : `Order draft missing ${missingFields.join(", ") || "key details"}`,
    why: [
      missingFields.length
        ? `Missing fields: ${missingFields.join(", ")}`
        : "All required fields captured",
      allWarnings.length ? `Warnings: ${allWarnings.join(" | ")}` : "No rule warnings triggered",
    ],
    actions: readyToPrice
      ? [
          { label: "Proceed to plan", action: "APPLY" },
          { label: "Re-run analysis", action: "ADJUST" },
        ]
      : [
          { label: "Draft follow-up", action: "APPLY" },
          { label: "Dismiss warning", action: "DISMISS" },
        ],
  };

  return {
    missingFields,
    slaWarnings,
    blacklistHits,
    borderWarnings,
    nextStep,
    summary,
  };
}

export async function draftInfoRequestEmail(
  draft: DraftOrderInput
): Promise<{ subject: string; body: string; summary: SuggestionSummary }> {
  const missing = [] as string[];
  const fields: Array<keyof DraftOrderInput> = [
    "puWindowStart",
    "puWindowEnd",
    "delWindowStart",
    "delWindowEnd",
    "requiredTruck",
  ];
  for (const field of fields) {
    if (!normalize(draft[field] as string | null | undefined)) {
      missing.push(field.replace(/([A-Z])/g, " $1").toLowerCase());
    }
  }

  const customer = normalize(draft.customer) ?? "Customer";
  const subject = `Information request for ${customer}`;
  const bodyLines = [
    `Hi ${customer},`,
    "",
    "Thanks for sending over the load details. We just need a couple more items to finalize pricing:",
    missing.length ? `• ${missing.join("\n• ")}` : "• Please confirm pickup and delivery windows",
    "",
    "Once we have this, we can send you a rate confirmation right away.",
    "",
    "Thanks,",
    "Dispatch Team",
  ];

  const summary: SuggestionSummary = {
    textSummary: "Drafted follow-up email requesting missing info",
    why: [missing.length ? `Missing: ${missing.join(", ")}` : "Default follow-up template"],
    actions: [
      { label: "Copy email", action: "APPLY" },
      { label: "Adjust", action: "ADJUST" },
      { label: "Dismiss", action: "DISMISS" },
    ],
  };

  return {
    subject,
    body: bodyLines.join("\n"),
    summary,
  };
}

export type DraftInfoEmailResult = Awaited<ReturnType<typeof draftInfoRequestEmail>>;
