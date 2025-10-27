/**
 * Routing + ETA integration scaffold.
 *
 * Example endpoints:
 *   - Google Distance Matrix API
 *       GET https://maps.googleapis.com/maps/api/distancematrix/json?origins=...&destinations=...
 *       Header: Authorization: Bearer <ROUTING_API_KEY> (or key query param)
 *   - HERE Routing API
 *       GET https://router.hereapi.com/v8/routes?transportMode=truck&origin=...&destination=...
 *
 * Authentication:
 *   - Store API credentials in server-side env vars (ROUTING_API_KEY, ROUTING_BASE_URL).
 *   - Use server-side fetch with TLS, never expose keys to the client.
 *
 * TODO:
 *   - Add distance matrix call with real-time traffic + toll settings.
 *   - Normalize vendor payload to our internal estimate schema.
 *   - Support cross-border compliance flags (HOS, customs wait times, etc.).
 */

export interface RouteEstimate {
  miles: number;
  etaMinutes: number;
  trafficNote: string;
}

export async function getRouteEstimate(origin: string, destination: string): Promise<RouteEstimate> {
  // TODO: Make authenticated HTTP request to routing provider.
  // const response = await fetch(`${process.env.ROUTING_BASE_URL}/distance-matrix`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.ROUTING_API_KEY}`,
  //   },
  //   body: JSON.stringify({ origin, destination, mode: "truck" }),
  // });
  // const payload = await response.json();
  // return normalizeRouteEstimate(payload);

  return {
    miles: 522,
    etaMinutes: 9 * 60 + 10,
    trafficNote: "Live traffic adds 22 min vs free-flow. Border wait ~14 min.",
  };
}
