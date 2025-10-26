import { format, parse } from "date-fns";

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

type OrderFieldKey = keyof ParsedOrder;

const FIELD_PATTERNS: Record<OrderFieldKey, RegExp[]> = {
  customer: [/\bcustomer\b/i, /\bcust(?:omer)? name\b/i, /\bshipper\b/i],
  origin: [/\borigin\b/i, /\bpick ?up\b/i, /\bfrom\b/i],
  destination: [/\bdestination\b/i, /\bdeliver(?:y)?\b/i, /\bto\b/i],
  puWindowStart: [/\bpu (?:window|start)\b/i, /\bpick ?up (?:window|start)\b/i],
  puWindowEnd: [/\bpu (?:end|close)\b/i, /\bpick ?up (?:end|close)\b/i],
  delWindowStart: [/\bdel(?:ivery)? (?:window|start)\b/i, /\bdrop (?:window|start)\b/i],
  delWindowEnd: [/\bdel(?:ivery)? (?:end|close)\b/i, /\bdrop (?:end|close)\b/i],
  requiredTruck: [/\btruck\b/i, /\beq(?:uipment)?\b/i, /\btrailer\b/i],
  notes: [/\bnotes?\b/i, /\bcomments?\b/i, /\binstructions?\b/i],
};

const DATETIME_PATTERNS = [
  "MM/dd/yyyy HH:mm",
  "MM/dd/yyyy hh:mm a",
  "MM/dd/yy HH:mm",
  "MM/dd/yy hh:mm a",
  "MM-dd-yyyy HH:mm",
  "MM-dd-yy HH:mm",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd'T'HH:mm",
  "MM/dd HH:mm",
  "MM/dd hh:mm a",
  "MM-dd HH:mm",
  "MM-dd hh:mm a",
  "M/d/yyyy HHmm",
  "M/d/yy HHmm",
];

const LOCAL_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

function normalize(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

function findField(text: string, key: OrderFieldKey): string | undefined {
  const patterns = FIELD_PATTERNS[key];
  if (!patterns) return undefined;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        const [, value] = trimmed.split(/[:\-]/, 2);
        if (value) return normalize(value);
        const match = trimmed.replace(pattern, "").trim();
        if (match) return normalize(match);
      }
    }
  }
  return undefined;
}

function parseWindow(raw: string | undefined): { start?: string; end?: string } {
  if (!raw) return {};
  const pieces = raw
    .split(/(?:-|–|to|through|>)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length === 0) {
    const start = parseDateLike(raw);
    return { start: start ?? undefined };
  }
  const [startRaw, endRaw] = pieces;
  const start = parseDateLike(startRaw ?? "");
  const end = parseDateLike(endRaw ?? "");
  const result: { start?: string; end?: string } = {};
  if (start) result.start = start;
  if (end) result.end = end;
  return result;
}

function parseDateLike(value: string): string | undefined {
  const normalized = value.replace(/@/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  for (const pattern of DATETIME_PATTERNS) {
    const parsed = safeParse(normalized, pattern);
    if (parsed) return parsed;
  }
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return format(direct, LOCAL_DATETIME_FORMAT);
  }
  return undefined;
}

function safeParse(value: string, pattern: string): string | undefined {
  try {
    const parsed = parse(value, pattern, new Date());
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, LOCAL_DATETIME_FORMAT);
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function parseOcrToOrder(text: string): ParsedOrder {
  const normalizedText = text.replace(/\u00A0/g, " ");

  const baseFields: ParsedOrder = {
    customer: findField(normalizedText, "customer"),
    origin: findField(normalizedText, "origin"),
    destination: findField(normalizedText, "destination"),
    requiredTruck: findField(normalizedText, "requiredTruck"),
    notes: findField(normalizedText, "notes"),
  };

  const puLine =
    findField(normalizedText, "puWindowStart") ?? findField(normalizedText, "puWindowEnd");
  const delLine =
    findField(normalizedText, "delWindowStart") ?? findField(normalizedText, "delWindowEnd");

  const puWindow = parseWindow(puLine);
  const delWindow = parseWindow(delLine);

  return {
    ...baseFields,
    puWindowStart: puWindow.start,
    puWindowEnd: puWindow.end,
    delWindowStart: delWindow.start,
    delWindowEnd: delWindow.end,
  };
}

export const parseOrderFromText = parseOcrToOrder;
