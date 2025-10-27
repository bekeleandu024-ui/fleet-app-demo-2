"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { TripEventDTO, TripStopDTO } from "./TripMapAndStatus";

const STOP_COLORS: Record<string, { bg: string; text: string }> = {
  PICKUP: { bg: "#0ea5e9", text: "#082f49" },
  DELIVERY: { bg: "#6366f1", text: "#111827" },
  DROP_HOOK: { bg: "#f59e0b", text: "#422006" },
  BORDER: { bg: "#f43f5e", text: "#450a0a" },
  OTHER: { bg: "#94a3b8", text: "#0f172a" },
};

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [bounds, map]);
  return null;
}

function FocusEvent({
  event,
}: {
  event: (TripEventDTO & { lat: number; lon: number }) | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (!event || typeof event.lat !== "number" || typeof event.lon !== "number") {
      return;
    }
    map.flyTo([event.lat, event.lon], Math.max(map.getZoom(), 6), { duration: 0.6 });
  }, [event, map]);
  return null;
}

function createStopIcon(seq: number, stopType: string) {
  const color = STOP_COLORS[stopType] ?? STOP_COLORS.OTHER;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        border: 2px solid rgba(15,23,42,0.6);
        background:${color.bg};
        color:${color.text};
        font-size:12px;
        font-weight:700;
        box-shadow:0 6px 18px rgba(15,23,42,0.35);
      ">
        ${seq}
      </div>
    `,
    iconAnchor: [16, 16],
  });
}

function eventColor(event: TripEventDTO) {
  if (event.type === "TRIP_START") return "#34d399";
  if (event.type === "TRIP_END") return "#cbd5f5";
  if (event.stop?.stopType === "BORDER" || event.type === "BORDER_CROSS") return "#f43f5e";
  if (event.stop?.stopType === "DROP_HOOK" || event.type === "DROP_HOOK") return "#facc15";
  if (event.stop?.stopType === "PICKUP" || event.type.startsWith("PICKUP")) return "#38bdf8";
  if (event.stop?.stopType === "DELIVERY" || event.type.startsWith("DELIVERY")) return "#a855f7";
  return "#94a3b8";
}

interface Props {
  stops: TripStopDTO[];
  events: TripEventDTO[];
  focusedEventId: string | null;
}

export default function TripMapClient({ stops, events, focusedEventId }: Props) {
  const stopsWithCoords = useMemo(
    () =>
      stops.filter(
        (stop) => typeof stop.lat === "number" && typeof stop.lon === "number"
      ) as Array<TripStopDTO & { lat: number; lon: number }>,
    [stops]
  );

  const eventsWithCoords = useMemo(
    () =>
      events.filter(
        (event) => typeof event.lat === "number" && typeof event.lon === "number"
      ) as Array<TripEventDTO & { lat: number; lon: number }>,
    [events]
  );

  const points: [number, number][] = [
    ...stopsWithCoords.map((stop) => [stop.lat, stop.lon] as [number, number]),
    ...eventsWithCoords.map((event) => [event.lat, event.lon] as [number, number]),
  ];

  const bounds = useMemo(() => {
    if (points.length === 0) {
      return null;
    }
    return L.latLngBounds(points.map(([lat, lon]) => L.latLng(lat, lon)));
  }, [points]);

  const focusedEvent = focusedEventId
    ? eventsWithCoords.find((event) => event.id === focusedEventId)
    : undefined;

  const polylinePositions = stopsWithCoords.map((stop) => [stop.lat, stop.lon] as [number, number]);

  const center = points.length > 0 ? points[0] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={5}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {bounds ? <FitBounds bounds={bounds} /> : null}
      {focusedEvent ? <FocusEvent event={focusedEvent} /> : null}
      {polylinePositions.length >= 2 ? (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#38bdf8", weight: 3, opacity: 0.7 }}
        />
      ) : null}
      {stopsWithCoords.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lon]}
          icon={createStopIcon(stop.seq, stop.stopType)}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{stopTypeLabel(stop.stopType)}</div>
              <div>{stop.name || stop.city || "Stop"}</div>
              {stop.city || stop.state ? (
                <div className="text-xs text-slate-500">
                  {[stop.city, stop.state].filter(Boolean).join(", ")}
                </div>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
      {eventsWithCoords.map((event) => (
        <CircleMarker
          key={event.id}
          center={[event.lat, event.lon]}
          radius={focusedEventId === event.id ? 8 : 5}
          pathOptions={{
            color: focusedEventId === event.id ? "#f97316" : eventColor(event),
            fillColor: focusedEventId === event.id ? "#fb923c" : eventColor(event),
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{prettyEventType(event.type)}</div>
              <div className="text-xs text-slate-500">
                {new Date(event.at).toLocaleString()}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function stopTypeLabel(stopType: string) {
  switch (stopType) {
    case "PICKUP":
      return "Pickup";
    case "DELIVERY":
      return "Delivery";
    case "DROP_HOOK":
      return "Drop & Hook";
    case "BORDER":
      return "Border";
    default:
      return stopType;
  }
}

function prettyEventType(type: string) {
  switch (type) {
    case "TRIP_START":
      return "Trip started";
    case "TRIP_END":
      return "Trip finished";
    case "PICKUP_ARRIVE":
      return "Arrived pickup";
    case "PICKUP_DEPART":
      return "Left pickup";
    case "DELIVERY_ARRIVE":
      return "Arrived delivery";
    case "DELIVERY_DEPART":
      return "Left delivery";
    case "BORDER_CROSS":
      return "Crossed border";
    case "DROP_HOOK":
      return "Drop & hook";
    default:
      return type.replaceAll("_", " ");
  }
}
