/**
 * Samsara / Motive / Geotab telematics integration scaffolding.
 *
 * Example endpoint:
 *   GET https://api.samsara.com/fleet/vehicles/stats
 *   Headers: Authorization: Bearer <TELEMATICS_API_TOKEN>
 *   Query: { vehicleIds: string[], types: ['gps', 'diagnostics'] }
 *
 * Authentication:
 *   - Store secrets in server-side environment vars (e.g. TELEMATICS_API_TOKEN).
 *   - Never expose telemetry tokens to the browser. Do not use NEXT_PUBLIC_.
 *
 * TODO:
 *   - Inject base URL + API token from env.
 *   - Poll vendor every 30-60 seconds and cache results for UI subscribers.
 *   - Expand payload to include HOS, odometer, fault codes, etc.
 */

export interface TelematicsUnitLocation {
  unitCode: string;
  driverName: string | null;
  lat: number;
  lon: number;
  lastSeenAtISO: string;
  status: "idling" | "driving" | "offline" | "parked" | string;
}

export async function fetchUnitLocations(): Promise<TelematicsUnitLocation[]> {
  // TODO: Replace mock with HTTP client hitting telematics vendor distance endpoint.
  // const response = await fetch(`${process.env.TELEMATICS_BASE_URL}/fleet/vehicles/stats`, {
  //   headers: {
  //     Authorization: `Bearer ${process.env.TELEMATICS_API_TOKEN}`,
  //   },
  // });
  // const payload = await response.json();
  // return normalizeTelematicsPayload(payload);

  const now = Date.now();
  return [
    {
      unitCode: "734401",
      driverName: "Karl Singh",
      lat: 43.6532 + Math.random() * 0.05,
      lon: -79.3832 + Math.random() * 0.05,
      lastSeenAtISO: new Date(now - 6 * 60 * 1000).toISOString(),
      status: "driving",
    },
    {
      unitCode: "734405",
      driverName: "Elena Miro",
      lat: 42.3314,
      lon: -83.0458,
      lastSeenAtISO: new Date(now - 18 * 60 * 1000).toISOString(),
      status: "idling",
    },
    {
      unitCode: "734410",
      driverName: "Unassigned",
      lat: 41.8781,
      lon: -87.6298,
      lastSeenAtISO: new Date(now - 42 * 60 * 1000).toISOString(),
      status: "parked",
    },
  ];
}
