export type ParsedOrder = {
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

const windowSeparators = [" to ", " - ", "–", "—"];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

export function parseOcrToOrder(rawText: string): ParsedOrder {
  if (!rawText) {
    return {};
  }

  const result: ParsedOrder = {};
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (!result.customer && /customer|shipper|account/.test(lower)) {
      const customer = line.replace(/.*?:\s*/, "").trim();
      if (customer) {
        result.customer = customer;
        continue;
      }
    }

    if (!result.origin && /(pickup|origin|from)/.test(lower)) {
      const origin = line.replace(/.*?(pickup|origin|from)[:\-]?/i, "").trim();
      if (origin) {
        result.origin = origin;
        const window = extractWindow(line);
        if (window.start && !result.puWindowStart) result.puWindowStart = window.start;
        if (window.end && !result.puWindowEnd) result.puWindowEnd = window.end;
        continue;
      }
    }

    if (!result.destination && /(delivery|drop|dest|to)/.test(lower)) {
      const destination = line.replace(/.*?(delivery|drop|dest|to)[:\-]?/i, "").trim();
      if (destination) {
        result.destination = destination;
        const window = extractWindow(line);
        if (window.start && !result.delWindowStart) result.delWindowStart = window.start;
        if (window.end && !result.delWindowEnd) result.delWindowEnd = window.end;
        continue;
      }
    }

    if (!result.requiredTruck && /(truck|equipment|trailer)/.test(lower)) {
      const requiredTruck = line.replace(/.*?(truck|equipment|trailer)[:\-]?/i, "").trim();
      if (requiredTruck) {
        result.requiredTruck = requiredTruck;
        continue;
      }
    }

    if (!result.customer && /^[A-Z][\w\s&.,-]{4,}$/.test(line) && line.split(" ").length <= 5) {
      result.customer = line.trim();
      continue;
    }

    if (!result.notes && /(notes|instructions|comment)/.test(lower)) {
      const note = line.replace(/.*?(notes|instructions|comment)[:\-]?/i, "").trim();
      if (note) {
        result.notes = note;
        continue;
      }
    }
  }

  if (!result.notes) {
    const trailing = lines.slice(-2).join(". ");
    if (trailing && trailing.length <= 160) {
      result.notes = trailing;
    }
  }

  return result;
}

export const parseOrderFromText = parseOcrToOrder;
