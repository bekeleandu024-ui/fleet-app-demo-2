type GeocodedPoint = {
  lat: number;
  lon: number;
  countryCode?: string;
};

export interface RouteEstimate {
  miles: number;
  etaMinutes: number;
  trafficDelayMinutes: number;
  crossesBorder: boolean;
  trafficNote: string;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

async function geocodeLocation(query: string): Promise<GeocodedPoint> {
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "FleetOps-Demo/1.0 (+https://example.com)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to geocode location: ${query}`);
  }

  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    address?: { country_code?: string };
  }>;

  if (!payload.length) {
    throw new Error(`No geocode results for: ${query}`);
  }

  const result = payload[0];
  const lat = Number.parseFloat(result.lat);
  const lon = Number.parseFloat(result.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Invalid geocode response for: ${query}`);
  }

  return {
    lat,
    lon,
    countryCode: result.address?.country_code?.toUpperCase(),
  };
}

async function fetchRoute(origin: GeocodedPoint, destination: GeocodedPoint) {
  const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = new URL(`${OSRM_BASE_URL}/${coordinates}`);
  url.searchParams.set("overview", "false");
  url.searchParams.set("steps", "false");
  url.searchParams.set("alternatives", "false");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": process.env.OSRM_USER_AGENT ?? "FleetOps-Demo/1.0 (+https://example.com)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch routing data for ${coordinates}`);
  }

  const payload = (await response.json()) as {
    code: string;
    routes?: Array<{ distance: number; duration: number }>;
  };

  if (payload.code !== "Ok" || !payload.routes?.length) {
    throw new Error(`No route available for ${coordinates}`);
  }

  return payload.routes[0];
}

function buildTrafficNote(distanceMiles: number, etaMinutes: number, crossesBorder: boolean) {
  const baselineSpeedMph = 55;
  const baselineMinutes = (distanceMiles / baselineSpeedMph) * 60;
  const delayMinutes = etaMinutes - baselineMinutes;

  const parts: string[] = [];

  if (Math.abs(delayMinutes) <= 1) {
    parts.push("Routing on pace with a 55 mph baseline.");
  } else if (delayMinutes > 1) {
    parts.push(`Routing adds approximately ${delayMinutes.toFixed(0)} min vs a 55 mph baseline.`);
  } else {
    parts.push(`Routing saves approximately ${Math.abs(delayMinutes).toFixed(0)} min vs a 55 mph baseline.`);
  }

  if (crossesBorder) {
    parts.push("Route crosses an international border; plan customs time accordingly.");
  }

  return { delayMinutes: Math.max(0, delayMinutes), note: parts.join(" ") };
}

export async function getRouteEstimate(origin: string, destination: string): Promise<RouteEstimate> {
  const [originPoint, destinationPoint] = await Promise.all([
    geocodeLocation(origin),
    geocodeLocation(destination),
  ]);

  const route = await fetchRoute(originPoint, destinationPoint);
  const miles = route.distance / 1609.344;
  const etaMinutes = route.duration / 60;
  const crossesBorder =
    !!originPoint.countryCode &&
    !!destinationPoint.countryCode &&
    originPoint.countryCode !== destinationPoint.countryCode;

  const { delayMinutes, note } = buildTrafficNote(miles, etaMinutes, crossesBorder);

  return {
    miles,
    etaMinutes,
    trafficDelayMinutes: delayMinutes,
    crossesBorder,
    trafficNote: note,
  };
}
