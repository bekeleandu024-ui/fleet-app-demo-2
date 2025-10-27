/**
 * Freight market rate integration scaffold.
 *
 * Potential vendors:
 *   - DAT RateView API
 *   - Truckstop Market Demand Index
 *   - Loadsmart pricing graphQL
 *
 * Example DAT API:
 *   POST https://api.dat.com/v1/rates/lanes
 *   Headers: Authorization: Bearer <MARKET_RATES_TOKEN>
 *   Body: { origin: { market: 'GTA' }, destination: { market: 'CHI' } }
 *
 * Authentication:
 *   - Store API keys/tokens in server-side env vars (MARKET_RATES_TOKEN).
 *   - Some providers require OAuth2 client credentials; refresh token server-side.
 *
 * TODO:
 *   - Implement polling + caching (Redis/Vercel KV) to avoid rate-limit issues.
 *   - Map vendor-specific lane granularity (zip3, market, province) into our zone codes.
 */

export interface LaneRate {
  rpm: number;
  source: string;
  lastUpdated: Date;
}

export async function getLaneRate(originZone: string, destZone: string): Promise<LaneRate> {
  // TODO: Replace with authenticated HTTP request to rate provider.
  // const response = await fetch(`${process.env.MARKET_RATES_BASE_URL}/lanes`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.MARKET_RATES_TOKEN}`,
  //   },
  //   body: JSON.stringify({ origin: { market: originZone }, destination: { market: destZone } }),
  // });
  // const payload = await response.json();
  // return normalizeLaneRate(payload);

  const now = new Date();
  const rpmLookup: Record<string, { rpm: number; source: string; lastUpdated?: Date }> = {
    "GTA>CHI": { rpm: 2.21, source: "DAT", lastUpdated: new Date("2025-10-27T19:16:52Z") },
    "GTA>NYC": { rpm: 2.42, source: "Truckstop", lastUpdated: new Date("2025-10-27T19:16:52Z") },
  };
  const key = `${originZone.toUpperCase()}>${destZone.toUpperCase()}`;
  const fallback = { rpm: 2.05, source: "DAT" };
  const rate = rpmLookup[key] ?? fallback;

  return {
    rpm: rate.rpm,
    source: rate.source,
    lastUpdated: rate.lastUpdated ?? now,
  };
}
