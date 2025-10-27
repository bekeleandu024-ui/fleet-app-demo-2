"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, {
  ssr: false,
});
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, {
  ssr: false,
});
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, {
  ssr: false,
});
const Polyline = dynamic(
  async () => (await import("react-leaflet")).Polyline,
  { ssr: false }
);

export type StopDTO = {
  id: string;
  seq: number;
  stopType: string;
  city?: string | null;
  state?: string | null;
  name?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export type EventDTO = {
  id: string;
  type: string;
  at: string;
  stopId?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type LatLngTuple = [number, number];

export default function TripMapClient({
  stops,
  events,
}: {
  stops: StopDTO[];
  events: EventDTO[];
}) {
  const coords = useMemo<LatLngTuple[]>(() => {
    const points: LatLngTuple[] = [];
    for (const stop of stops) {
      if (typeof stop.lat === "number" && typeof stop.lon === "number") {
        points.push([stop.lat, stop.lon]);
      }
    }
    for (const event of events) {
      if (typeof event.lat === "number" && typeof event.lon === "number") {
        points.push([event.lat, event.lon]);
      }
    }
    return points;
  }, [stops, events]);

  const polylinePositions = useMemo<LatLngTuple[]>(() => {
    return stops
      .filter((stop) => typeof stop.lat === "number" && typeof stop.lon === "number")
      .sort((a, b) => a.seq - b.seq)
      .map((stop) => [stop.lat as number, stop.lon as number]);
  }, [stops]);

  const defaultCenter: LatLngTuple = coords[0] ?? [43.4503, -80.482];

  if (coords.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-white/10 bg-slate-900/40 text-xs text-slate-400">
        No live position yet.
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full rounded-lg border border-white/10 bg-slate-900/40 text-slate-100">
      <MapContainer
        center={defaultCenter}
        zoom={8}
        scrollWheelZoom={false}
        className="h-full w-full rounded-lg"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polylinePositions.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: "#38bdf8", weight: 3 }}
          />
        )}

        {stops.map((stop) => {
          if (typeof stop.lat !== "number" || typeof stop.lon !== "number") {
            return null;
          }
          return (
            <Marker key={`stop-${stop.id}`} position={[stop.lat, stop.lon]}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">
                    Stop {stop.seq}: {stop.stopType}
                  </div>
                  <div>
                    {stop.city ?? ""} {stop.state ?? ""}
                  </div>
                  {stop.name && <div>{stop.name}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {events.map((event) => {
          if (typeof event.lat !== "number" || typeof event.lon !== "number") {
            return null;
          }
          return (
            <Marker key={`event-${event.id}`} position={[event.lat, event.lon]}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{event.type}</div>
                  <div>{new Date(event.at).toLocaleString()}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
