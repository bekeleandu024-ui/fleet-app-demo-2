import prisma from "@/lib/prisma";

export type FleetMapUnits = Array<{
  unitId: string;
  code: string;
  lat: number;
  lon: number;
  available: boolean;
  driverName?: string;
  homeBase?: string;
  lastMarginPct?: number | null;
}>;

export type FleetMapLanes = Array<{
  tripId: string;
  origin: { lat: number; lon: number };
  dest: { lat: number; lon: number };
  miles: number;
  marketRPM: number;
}>;

export type FleetMapData = {
  units: FleetMapUnits;
  lanes: FleetMapLanes;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

export async function getFleetMapData(): Promise<FleetMapData> {
  const [units, trips] = await Promise.all([
    prisma.unit.findMany({
      include: {
        trips: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { marginPct: true },
        },
      },
    }),
    prisma.trip.findMany({
      where: { status: { in: ["Dispatched", "InTransit"] } },
      select: {
        id: true,
        originLat: true,
        originLon: true,
        destLat: true,
        destLon: true,
        miles: true,
        marketRPM: true,
      },
    }),
  ]);

  const unitPayload: FleetMapUnits = units.map((unit) => ({
    unitId: unit.id,
    code: unit.code,
    lat: unit.lastKnownLat ?? 0,
    lon: unit.lastKnownLon ?? 0,
    available: !unit.isOnHold && (unit.status ?? "Available") === "Available",
    driverName: undefined,
    homeBase: unit.homeBase ?? undefined,
    lastMarginPct: unit.trips[0]?.marginPct ? Number(unit.trips[0]?.marginPct) : null,
  }));

  const lanePayload: FleetMapLanes = trips
    .filter((trip) => trip.originLat !== null && trip.destLat !== null)
    .map((trip) => ({
      tripId: trip.id,
      origin: { lat: trip.originLat ?? 0, lon: trip.originLon ?? 0 },
      dest: { lat: trip.destLat ?? 0, lon: trip.destLon ?? 0 },
      miles: toNumber(trip.miles),
      marketRPM: toNumber(trip.marketRPM ?? 0),
    }));

  return { units: unitPayload, lanes: lanePayload };
}
