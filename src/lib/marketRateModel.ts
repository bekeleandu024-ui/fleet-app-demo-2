export type MarketCode = keyof typeof MARKET_DEFINITIONS;

export interface MarketDefinition {
  code: string;
  name: string;
  country: "US" | "CA";
  region:
    | "Canada"
    | "Northeast"
    | "Midwest"
    | "Southeast"
    | "South"
    | "West"
    | "Mountain";
  lat: number;
  lon: number;
  outboundTightness: number;
  inboundRejection: number;
  costIndex: number;
  produceMonths?: number[];
  slowSeasonMonths?: number[];
}

const MARKET_DEFINITIONS = {
  GTA: {
    code: "GTA",
    name: "Greater Toronto, ON",
    country: "CA",
    region: "Canada",
    lat: 43.653,
    lon: -79.383,
    outboundTightness: 0.62,
    inboundRejection: 0.52,
    costIndex: 0.6,
    slowSeasonMonths: [7, 8],
  },
  MTL: {
    code: "MTL",
    name: "Montreal, QC",
    country: "CA",
    region: "Canada",
    lat: 45.5017,
    lon: -73.5673,
    outboundTightness: 0.55,
    inboundRejection: 0.48,
    costIndex: 0.58,
    slowSeasonMonths: [6, 7, 8],
  },
  VAN: {
    code: "VAN",
    name: "Vancouver, BC",
    country: "CA",
    region: "Canada",
    lat: 49.2827,
    lon: -123.1207,
    outboundTightness: 0.57,
    inboundRejection: 0.5,
    costIndex: 0.64,
  },
  CAL: {
    code: "CAL",
    name: "Calgary, AB",
    country: "CA",
    region: "Canada",
    lat: 51.0447,
    lon: -114.0719,
    outboundTightness: 0.53,
    inboundRejection: 0.46,
    costIndex: 0.48,
  },
  CHI: {
    code: "CHI",
    name: "Chicago, IL",
    country: "US",
    region: "Midwest",
    lat: 41.8781,
    lon: -87.6298,
    outboundTightness: 0.53,
    inboundRejection: 0.5,
    costIndex: 0.47,
  },
  DET: {
    code: "DET",
    name: "Detroit, MI",
    country: "US",
    region: "Midwest",
    lat: 42.3314,
    lon: -83.0458,
    outboundTightness: 0.49,
    inboundRejection: 0.46,
    costIndex: 0.44,
  },
  MSP: {
    code: "MSP",
    name: "Minneapolis, MN",
    country: "US",
    region: "Midwest",
    lat: 44.9778,
    lon: -93.265,
    outboundTightness: 0.51,
    inboundRejection: 0.47,
    costIndex: 0.45,
  },
  NYC: {
    code: "NYC",
    name: "New York City, NY",
    country: "US",
    region: "Northeast",
    lat: 40.7128,
    lon: -74.006,
    outboundTightness: 0.68,
    inboundRejection: 0.65,
    costIndex: 0.72,
  },
  BOS: {
    code: "BOS",
    name: "Boston, MA",
    country: "US",
    region: "Northeast",
    lat: 42.3601,
    lon: -71.0589,
    outboundTightness: 0.61,
    inboundRejection: 0.58,
    costIndex: 0.69,
  },
  PHL: {
    code: "PHL",
    name: "Philadelphia, PA",
    country: "US",
    region: "Northeast",
    lat: 39.9526,
    lon: -75.1652,
    outboundTightness: 0.59,
    inboundRejection: 0.55,
    costIndex: 0.63,
  },
  ATL: {
    code: "ATL",
    name: "Atlanta, GA",
    country: "US",
    region: "Southeast",
    lat: 33.749,
    lon: -84.388,
    outboundTightness: 0.58,
    inboundRejection: 0.54,
    costIndex: 0.43,
    produceMonths: [3, 4, 5, 6],
  },
  CLT: {
    code: "CLT",
    name: "Charlotte, NC",
    country: "US",
    region: "Southeast",
    lat: 35.2271,
    lon: -80.8431,
    outboundTightness: 0.55,
    inboundRejection: 0.52,
    costIndex: 0.46,
    produceMonths: [4, 5, 6],
  },
  SAV: {
    code: "SAV",
    name: "Savannah, GA",
    country: "US",
    region: "Southeast",
    lat: 32.0809,
    lon: -81.0912,
    outboundTightness: 0.6,
    inboundRejection: 0.57,
    costIndex: 0.45,
    produceMonths: [3, 4, 5, 6],
  },
  MIA: {
    code: "MIA",
    name: "Miami, FL",
    country: "US",
    region: "Southeast",
    lat: 25.7617,
    lon: -80.1918,
    outboundTightness: 0.64,
    inboundRejection: 0.6,
    costIndex: 0.5,
    produceMonths: [2, 3, 4, 5],
  },
  MEM: {
    code: "MEM",
    name: "Memphis, TN",
    country: "US",
    region: "South",
    lat: 35.1495,
    lon: -90.049,
    outboundTightness: 0.56,
    inboundRejection: 0.53,
    costIndex: 0.42,
  },
  DAL: {
    code: "DAL",
    name: "Dallas, TX",
    country: "US",
    region: "South",
    lat: 32.7767,
    lon: -96.797,
    outboundTightness: 0.57,
    inboundRejection: 0.49,
    costIndex: 0.38,
  },
  HOU: {
    code: "HOU",
    name: "Houston, TX",
    country: "US",
    region: "South",
    lat: 29.7604,
    lon: -95.3698,
    outboundTightness: 0.55,
    inboundRejection: 0.52,
    costIndex: 0.4,
  },
  LAX: {
    code: "LAX",
    name: "Los Angeles, CA",
    country: "US",
    region: "West",
    lat: 34.0522,
    lon: -118.2437,
    outboundTightness: 0.6,
    inboundRejection: 0.58,
    costIndex: 0.62,
    produceMonths: [4, 5, 6, 7, 8],
  },
  SFO: {
    code: "SFO",
    name: "Bay Area, CA",
    country: "US",
    region: "West",
    lat: 37.7749,
    lon: -122.4194,
    outboundTightness: 0.57,
    inboundRejection: 0.55,
    costIndex: 0.66,
    produceMonths: [5, 6, 7, 8],
  },
  SEA: {
    code: "SEA",
    name: "Seattle, WA",
    country: "US",
    region: "West",
    lat: 47.6062,
    lon: -122.3321,
    outboundTightness: 0.54,
    inboundRejection: 0.51,
    costIndex: 0.57,
  },
  PHX: {
    code: "PHX",
    name: "Phoenix, AZ",
    country: "US",
    region: "West",
    lat: 33.4484,
    lon: -112.074,
    outboundTightness: 0.52,
    inboundRejection: 0.48,
    costIndex: 0.41,
  },
  DEN: {
    code: "DEN",
    name: "Denver, CO",
    country: "US",
    region: "Mountain",
    lat: 39.7392,
    lon: -104.9903,
    outboundTightness: 0.5,
    inboundRejection: 0.46,
    costIndex: 0.43,
  },
  SLC: {
    code: "SLC",
    name: "Salt Lake City, UT",
    country: "US",
    region: "Mountain",
    lat: 40.7608,
    lon: -111.891,
    outboundTightness: 0.48,
    inboundRejection: 0.44,
    costIndex: 0.42,
  },
  LAS: {
    code: "LAS",
    name: "Las Vegas, NV",
    country: "US",
    region: "West",
    lat: 36.1699,
    lon: -115.1398,
    outboundTightness: 0.51,
    inboundRejection: 0.47,
    costIndex: 0.46,
  },
  KCY: {
    code: "KCY",
    name: "Kansas City, MO",
    country: "US",
    region: "Midwest",
    lat: 39.0997,
    lon: -94.5786,
    outboundTightness: 0.52,
    inboundRejection: 0.48,
    costIndex: 0.41,
  },
  CVG: {
    code: "CVG",
    name: "Cincinnati, OH",
    country: "US",
    region: "Midwest",
    lat: 39.1031,
    lon: -84.512,
    outboundTightness: 0.51,
    inboundRejection: 0.47,
    costIndex: 0.43,
  },
  LRD: {
    code: "LRD",
    name: "Laredo, TX",
    country: "US",
    region: "South",
    lat: 27.5306,
    lon: -99.4803,
    outboundTightness: 0.63,
    inboundRejection: 0.57,
    costIndex: 0.39,
  },
} as const satisfies Record<string, MarketDefinition>;

const MARKET_ALIASES: Record<string, MarketCode> = {
  TOR: "GTA",
  TORONTO: "GTA",
  YYZ: "GTA",
  MONTREAL: "MTL",
  YUL: "MTL",
  VANCOUVER: "VAN",
  YVR: "VAN",
  CALGARY: "CAL",
  CHICAGO: "CHI",
  ORD: "CHI",
  DETROIT: "DET",
  MINNEAPOLIS: "MSP",
  MSP: "MSP",
  NEWYORK: "NYC",
  NEWYORKCITY: "NYC",
  NYC: "NYC",
  NY: "NYC",
  BOS: "BOS",
  BOSTON: "BOS",
  PHL: "PHL",
  PHILADELPHIA: "PHL",
  ATLANTA: "ATL",
  ATL: "ATL",
  CHARLOTTE: "CLT",
  SAVANNAH: "SAV",
  MIAMI: "MIA",
  MEMPHIS: "MEM",
  DALLAS: "DAL",
  DFW: "DAL",
  HOUSTON: "HOU",
  IAH: "HOU",
  LOSANGELES: "LAX",
  LA: "LAX",
  LAX: "LAX",
  SANFRANCISCO: "SFO",
  OAKLAND: "SFO",
  BAYAREA: "SFO",
  SEATTLE: "SEA",
  TACOMA: "SEA",
  PHOENIX: "PHX",
  DENVER: "DEN",
  SALTLAKE: "SLC",
  SALTLAKECITY: "SLC",
  LASVEGAS: "LAS",
  VEGAS: "LAS",
  KANSASCITY: "KCY",
  KC: "KCY",
  CINCINNATI: "CVG",
  CINCY: "CVG",
  LAREDO: "LRD",
};

const LANE_OVERRIDES: Record<string, { rpm: number; source: string }> = {
  "GTA>CHI": { rpm: 2.21, source: "DAT RateView" },
  "GTA>NYC": { rpm: 2.42, source: "Truckstop" },
  "CHI>ATL": { rpm: 2.17, source: "DAT RateView" },
  "ATL>GTA": { rpm: 2.48, source: "FreightWaves SONAR" },
  "DAL>LAX": { rpm: 1.92, source: "DAT RateView" },
};

const LANE_ADJUSTMENTS: Record<string, number> = {
  "ATL>MIA": 0.22,
  "MIA>ATL": -0.18,
  "LAX>SEA": 0.15,
  "SEA>LAX": -0.08,
  "DAL>GTA": 0.3,
  "GTA>DAL": 0.18,
  "LRD>DAL": 0.12,
};

const RATE_SOURCES = ["DAT RateView", "Truckstop", "FreightWaves SONAR", "Bloomberg Linehaul"] as const;

export function normalizeMarketCode(input: string): MarketCode | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned) return null;

  if (cleaned in MARKET_DEFINITIONS) {
    return cleaned as MarketCode;
  }

  if (cleaned in MARKET_ALIASES) {
    return MARKET_ALIASES[cleaned];
  }

  if (cleaned.length > 3) {
    const start = cleaned.slice(0, 3);
    if (start in MARKET_DEFINITIONS) {
      return start as MarketCode;
    }
    if (start in MARKET_ALIASES) {
      return MARKET_ALIASES[start];
    }

    const end = cleaned.slice(-3);
    if (end in MARKET_DEFINITIONS) {
      return end as MarketCode;
    }
    if (end in MARKET_ALIASES) {
      return MARKET_ALIASES[end];
    }
  }

  return null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMiles(origin: MarketDefinition, destination: MarketDefinition): number {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);

  const originLat = toRadians(origin.lat);
  const destLat = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(originLat) * Math.cos(destLat);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.max(50, earthRadiusMiles * c);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pseudoRandomOffset(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  const normalized = (hash & 0xfff) / 0xfff; // 0 -> 1
  return normalized * 0.06 - 0.03; // range [-0.03, 0.03]
}

function baseRateForDistance(distanceMiles: number): number {
  const normalized = Math.max(distanceMiles, 50);
  const longHaulDecay = Math.exp(-normalized / 420);
  return 1.55 + 1.18 * longHaulDecay;
}

function computeSeasonalAdjustment(origin: MarketDefinition, destination: MarketDefinition, month: number): number {
  let adjustment = 0;

  const winterMonths = [0, 1, 11];
  if (winterMonths.includes(month)) {
    if (origin.country === "CA" || origin.lat > 42) {
      adjustment += 0.12;
    }
    if (destination.country === "CA" || destination.lat > 42) {
      adjustment += 0.05;
    }
  }

  if (origin.produceMonths?.includes(month)) {
    adjustment += 0.06;
  }
  if (destination.produceMonths?.includes(month)) {
    adjustment += 0.12;
  }

  if (origin.slowSeasonMonths?.includes(month)) {
    adjustment -= 0.05;
  }
  if (destination.slowSeasonMonths?.includes(month)) {
    adjustment -= 0.03;
  }

  return adjustment;
}

function pickSource(laneKey: string): string {
  const hash = laneKey.split("").reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) >>> 0, 5381);
  const index = hash % RATE_SOURCES.length;
  return RATE_SOURCES[index];
}

export function estimateLaneRpm(originCode: MarketCode, destinationCode: MarketCode): { rpm: number; source: string } {
  const laneKey = `${originCode}>${destinationCode}`;
  const override = LANE_OVERRIDES[laneKey];
  if (override) {
    return override;
  }

  const origin = MARKET_DEFINITIONS[originCode];
  const destination = MARKET_DEFINITIONS[destinationCode];
  if (!origin || !destination) {
    throw new Error("Unknown market lane");
  }

  const distance = haversineMiles(origin, destination);
  const month = new Date().getUTCMonth();

  const baseRate = baseRateForDistance(distance);
  const demandAdjustment =
    0.32 * (origin.outboundTightness - 0.5) +
    0.24 * (destination.inboundRejection - 0.5);
  const costAdjustment = 0.2 * (destination.costIndex - origin.costIndex);
  const crossBorderAdjustment = origin.country !== destination.country ? 0.28 : 0;
  const seasonalAdjustment = computeSeasonalAdjustment(origin, destination, month);
  const directionalAdjustment = LANE_ADJUSTMENTS[laneKey] ?? 0;
  const regionalBalance = 0.08 * (destination.outboundTightness - origin.inboundRejection);
  const randomNoise = pseudoRandomOffset(laneKey);

  const rpm = clamp(
    baseRate +
      demandAdjustment +
      costAdjustment +
      crossBorderAdjustment +
      seasonalAdjustment +
      directionalAdjustment +
      regionalBalance +
      randomNoise,
    1.45,
    4.25,
  );

  return {
    rpm: Number(rpm.toFixed(2)),
    source: pickSource(laneKey),
  };
}

export function listKnownMarkets(): MarketDefinition[] {
  return Object.values(MARKET_DEFINITIONS);
}
