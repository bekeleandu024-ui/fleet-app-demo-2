export type ParsedOrderDraft = {
  customer?: string;
  origin?: string;
  destination?: string;
  puWindowStart?: string;
  puWindowEnd?: string;
  delWindowStart?: string;
  delWindowEnd?: string;
  requiredTruck?: string;
  notes?: string;
};

export type ParsedOrderField = {
  field: keyof ParsedOrderDraft;
  value: string;
  sourceText: string;
};

export type ParsedOrderResult = {
  parsedOrder: ParsedOrderDraft;
  warnings: string[];
  fields: ParsedOrderField[];
};

const windowSeparators = [" to ", " - ", "–", "—"] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripLeadingLabel(value: string) {
  return value.replace(/^[^:]*:\s*/, "");
}

function toIsoLike(value?: string) {
  if (!value) return undefined;
  const cleaned = value
    .replace(/(pickup|delivery|window|start|end|time|at)/gi, "")
    .replace(/\b(on|by|from|between|before|after)\b/gi, " ")
    .replace(/[^\w\s:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;
  const parsed = Date.parse(cleaned);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString();
}

function extractWindow(line: string) {
  const lowered = line.toLowerCase();
  for (const sep of windowSeparators) {
    if (lowered.includes(sep.trim())) {
      const [startRaw, endRaw] = line.split(sep);
      return {
        start: toIsoLike(startRaw),
        end: toIsoLike(endRaw),
      };
    }
  }
  return {
    start: toIsoLike(line),
    end: undefined,
  };
}

function addField(
  result: ParsedOrderResult,
  field: keyof ParsedOrderDraft,
  value?: string,
  sourceText?: string
) {
  if (!value) return;
  if (!result.parsedOrder[field]) {
    result.parsedOrder[field] = value;
    if (sourceText) {
      result.fields.push({ field, value, sourceText });
    }
  }
}

export function parseOcrToOrder(rawText: string): ParsedOrderResult {
  if (!rawText) {
    return { parsedOrder: {}, warnings: ["No text detected"], fields: [] };
  }

  const result: ParsedOrderResult = { parsedOrder: {}, warnings: [], fields: [] };
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (!result.parsedOrder.customer && /customer|shipper|account/.test(lower)) {
      const customer = stripLeadingLabel(line).trim();
      if (customer) {
        addField(result, "customer", customer, line);
        continue;
      }
    }

    if (!result.parsedOrder.origin && /(pickup|origin|from)/.test(lower)) {
      const origin = line.replace(/.*?(pickup|origin|from)[:\-]?/i, "").trim();
      if (origin) {
        addField(result, "origin", origin, line);
        const window = extractWindow(line);
        addField(result, "puWindowStart", window.start, line);
        addField(result, "puWindowEnd", window.end, line);
        continue;
      }
    }

    if (!result.parsedOrder.destination && /(delivery|drop|dest|to)/.test(lower)) {
      const destination = line.replace(/.*?(delivery|drop|dest|to)[:\-]?/i, "").trim();
      if (destination) {
        addField(result, "destination", destination, line);
        const window = extractWindow(line);
        addField(result, "delWindowStart", window.start, line);
        addField(result, "delWindowEnd", window.end, line);
        continue;
      }
    }

    if (!result.parsedOrder.requiredTruck && /(truck|equipment|trailer)/.test(lower)) {
      const requiredTruck = line.replace(/.*?(truck|equipment|trailer)[:\-]?/i, "").trim();
      if (requiredTruck) {
        addField(result, "requiredTruck", requiredTruck, line);
        continue;
      }
    }

    if (!result.parsedOrder.customer && /^[A-Z][\w\s&.,-]{4,}$/.test(line) && line.split(" ").length <= 5) {
      addField(result, "customer", line.trim(), line);
      continue;
    }

    if (!result.parsedOrder.notes && /(notes|instructions|comment)/.test(lower)) {
      const note = stripLeadingLabel(line).trim();
      if (note) {
        addField(result, "notes", note, line);
        continue;
      }
    }
  }

  if (!result.parsedOrder.notes) {
    const trailing = lines.slice(-2).join(". ");
    if (trailing && trailing.length <= 160) {
      addField(result, "notes", trailing, trailing);
    }
  }

  const requiredFields: Array<keyof ParsedOrderDraft> = ["customer", "origin", "destination"];
  for (const field of requiredFields) {
    if (!result.parsedOrder[field]) {
      result.warnings.push(`Missing likely ${field}`);
    }
  }

  if (!result.parsedOrder.puWindowEnd && result.parsedOrder.puWindowStart) {
    result.warnings.push("Pickup window end missing");
  }
  if (!result.parsedOrder.delWindowEnd && result.parsedOrder.delWindowStart) {
    result.warnings.push("Delivery window end missing");
  }

  return result;
}

export type ParsedOrder = ParsedOrderDraft;
export const parseOrderFromText = parseOcrToOrder;
