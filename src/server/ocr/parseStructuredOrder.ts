export type ParsedOrder = {
  customer: string;
  origin: string;
  destination: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  requiredTruck?: string;
  notes?: string;
  confidence: number;
  warnings: string[];
};

const FIELD_LABELS: Array<{
  key: keyof ParsedOrder;
  pattern: RegExp;
}> = [
  { key: "customer", pattern: /(?:^|\b)customer(?: name)?[:\-]\s*(.+)$/i },
  { key: "origin", pattern: /(?:^|\b)(?:origin|pickup|from)[:\-]\s*(.+)$/i },
  { key: "destination", pattern: /(?:^|\b)(?:destination|delivery|to|drop)[:\-]\s*(.+)$/i },
  { key: "requiredTruck", pattern: /(?:equipment|truck|trailer)[:\-]\s*(.+)$/i },
  { key: "notes", pattern: /(?:notes?|instructions?)[:\-]\s*(.+)$/i },
];

const WINDOW_PATTERNS: Array<{
  startKey: keyof ParsedOrder;
  endKey: keyof ParsedOrder;
  pattern: RegExp;
}> = [
  {
    startKey: "pickupWindowStart",
    endKey: "pickupWindowEnd",
    pattern: /(?:pickup|pu)[^\n]*?(?:window|time|from)?[:\-]?\s*([^-\n]+?)(?:\s*(?:-|to)\s*([\w:.,\s]+))?$/i,
  },
  {
    startKey: "deliveryWindowStart",
    endKey: "deliveryWindowEnd",
    pattern: /(?:delivery|drop|del)[^\n]*?(?:window|time|by|from)?[:\-]?\s*([^-\n]+?)(?:\s*(?:-|to)\s*([\w:.,\s]+))?$/i,
  },
];

function normaliseValue(value?: string) {
  return value?.trim() ?? "";
}

function toIsoTimestamp(value?: string) {
  if (!value) return undefined;
  const trimmed = value.replace(/\b(at|on|by|from|between)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString();
}

function applyWindow(
  text: string,
  accumulator: Partial<ParsedOrder>,
  startKey: keyof ParsedOrder,
  endKey: keyof ParsedOrder,
  pattern: RegExp
) {
  const match = text.match(pattern);
  if (!match) return;
  const [, startRaw, endRaw] = match;
  const start = toIsoTimestamp(startRaw);
  const end = toIsoTimestamp(endRaw);
  if (start && !accumulator[startKey]) {
    accumulator[startKey] = start as ParsedOrder[typeof startKey];
  }
  if (end && !accumulator[endKey]) {
    accumulator[endKey] = end as ParsedOrder[typeof endKey];
  }
}

export async function parseStructuredOrder(ocrText: string): Promise<ParsedOrder> {
  const accumulator: Partial<ParsedOrder> = {
    warnings: [],
    confidence: 0,
  };

  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const rawLine of lines) {
    for (const { key, pattern } of FIELD_LABELS) {
      if (accumulator[key]) continue;
      const match = rawLine.match(pattern);
      if (match && match[1]) {
        accumulator[key] = normaliseValue(match[1]) as ParsedOrder[typeof key];
        break;
      }
    }

    for (const window of WINDOW_PATTERNS) {
      applyWindow(rawLine, accumulator, window.startKey, window.endKey, window.pattern);
    }
  }

  if (!accumulator.customer) {
    const guess = lines.find((line) => /(?:llc|inc|logistics|transport|freight)/i.test(line));
    if (guess) {
      accumulator.customer = normaliseValue(guess) as ParsedOrder["customer"];
    }
  }

  if (!accumulator.origin) {
    const guess = lines.find((line) => /(?:pickup|origin|from)\s+([\w\s,]+)/i.test(line));
    if (guess) {
      accumulator.origin = normaliseValue(guess.replace(/.*?(pickup|origin|from)[:\-]?/i, "")) as ParsedOrder["origin"];
    }
  }

  if (!accumulator.destination) {
    const guess = lines.find((line) => /(?:delivery|drop|to)\s+([\w\s,]+)/i.test(line));
    if (guess) {
      accumulator.destination = normaliseValue(
        guess.replace(/.*?(delivery|drop|dest|to)[:\-]?/i, "")
      ) as ParsedOrder["destination"];
    }
  }

  // TODO: call an LLM to fill missing fields more intelligently.

  const requiredKeys: Array<keyof ParsedOrder> = ["customer", "origin", "destination"];
  const warnings: string[] = [];
  let foundCount = 0;

  for (const key of requiredKeys) {
    if (!accumulator[key]) {
      warnings.push(`Could not determine ${key}`);
    } else {
      foundCount += 1;
    }
  }

  if (!accumulator.pickupWindowStart || !accumulator.pickupWindowEnd) {
    warnings.push("Couldn't infer full pickup window");
  } else {
    foundCount += 1;
  }

  if (!accumulator.deliveryWindowStart || !accumulator.deliveryWindowEnd) {
    warnings.push("Couldn't infer full delivery window");
  } else {
    foundCount += 1;
  }

  if (!accumulator.requiredTruck) {
    warnings.push("Truck requirements unclear");
  } else {
    foundCount += 1;
  }

  const notes = accumulator.notes ?? lines.slice(-2).join(" ");
  if (notes) {
    accumulator.notes = notes;
    foundCount += 1;
  }

  const totalSignals = 6; // basic heuristic fields considered above
  const confidence = Math.min(1, Math.max(0.4, foundCount / totalSignals));

  return {
    customer: accumulator.customer ?? "",
    origin: accumulator.origin ?? "",
    destination: accumulator.destination ?? "",
    pickupWindowStart: accumulator.pickupWindowStart,
    pickupWindowEnd: accumulator.pickupWindowEnd,
    deliveryWindowStart: accumulator.deliveryWindowStart,
    deliveryWindowEnd: accumulator.deliveryWindowEnd,
    requiredTruck: accumulator.requiredTruck,
    notes: accumulator.notes,
    confidence,
    warnings,
  };
}
