"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { LngLatBounds, Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/Intellifleet.css";

export type FleetUnitStatus = "onTrack" | "watch" | "action";

export type StatusToken = {
  label: string;
  marker: string;
  chip: string;
  legend: string;
  mapFill: string;
  mapStroke: string;
};

export type StatusTokenMap = Record<FleetUnitStatus, StatusToken>;

export type FleetUnit = {
  id: string;
  code: string;
  driverName: string;
  status: FleetUnitStatus;
  statusDetail?: string | null;
  lat: number;
  lon: number;
  lastPingLabel?: string;
};

export type LaneCallout = {
  title: string;
  subtitle: string;
  meta: string;
};

export type FleetMapProps = {
  units: FleetUnit[];
  statusTokens: StatusTokenMap;
  laneCallout?: LaneCallout;
  heightClassName?: string;
};

type MarkerBundle = {
  marker: Marker;
  popup: Popup;
  element: HTMLButtonElement;
};

const DEFAULT_CENTER: [number, number] = [-79.4, 43.7];
const DEFAULT_ZOOM = 5.2;
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const SAMPLE_PROMPTS = [
  "Where are my critical units right now?",
  "Summarize the fleet health",
  "Any trucks near Chicago with issues?",
];

function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildFleetSummary(units: FleetUnit[], tokens: StatusTokenMap) {
  if (!units.length) {
    return "AI Copilot: no active pings detected. Check telematics feed or refresh.";
  }

  const counts = units.reduce(
    (acc, unit) => {
      acc[unit.status] += 1;
      return acc;
    },
    { onTrack: 0, watch: 0, action: 0 },
  );

  const topAlerts = units
    .filter((unit) => unit.status !== "onTrack")
    .slice(0, 3)
    .map((unit) => `${unit.code} (${tokens[unit.status].label.toLowerCase()})`)
    .join(", ");

  const healthScore = Math.round(
    clamp(((counts.onTrack + counts.watch * 0.55) / units.length) * 100, 5, 100),
  );

  const alertLine = topAlerts
    ? `Focus on ${topAlerts} to stabilize the lane.`
    : "No elevated risk detected right now.";

  return `Fleet health ${healthScore}/100 · ${counts.action} critical · ${counts.watch} being watched. ${alertLine}`;
}

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function generateAiResponse(query: string, units: FleetUnit[], tokens: StatusTokenMap) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return buildFleetSummary(units, tokens);
  }

  if (!units.length) {
    return "No active telematics sessions available for the assistant to analyze.";
  }

  const actionUnits = units.filter((unit) => unit.status === "action");
  const watchUnits = units.filter((unit) => unit.status === "watch");

  if (/critical|issue|action|problem|alert/.test(normalized)) {
    if (!actionUnits.length) {
      return "The assistant isn't tracking any critical units at the moment.";
    }
    const listing = actionUnits
      .map((unit) => `${unit.code} (${unit.driverName || "Unassigned"}) near ${formatCoords(unit.lat, unit.lon)}`)
      .join(" · ");
    return `Critical focus: ${actionUnits.length} units flagged for intervention. ${listing}.`;
  }

  if (/watch|delay|detention|hold/.test(normalized)) {
    if (!watchUnits.length) {
      return "All monitored units are currently on plan.";
    }
    const watchList = watchUnits
      .map((unit) => `${unit.code} (${unit.lastPingLabel ?? "fresh ping"})`)
      .join(", ");
    return `Heads-up: ${watchUnits.length} units trending off-plan: ${watchList}.`;
  }

  if (/toronto|gta/.test(normalized) || /chicago|midwest/.test(normalized)) {
    const chicago = { lat: 41.8781, lon: -87.6298 };
    const toronto = { lat: 43.6532, lon: -79.3832 };
    const nearChicago = units.filter((unit) => haversineMiles({ lat: unit.lat, lon: unit.lon }, chicago) < 120);
    const nearToronto = units.filter((unit) => haversineMiles({ lat: unit.lat, lon: unit.lon }, toronto) < 80);
    const lines = [] as string[];
    if (nearToronto.length) {
      const issues = nearToronto.filter((unit) => unit.status !== "onTrack");
      lines.push(
        `${nearToronto.length} units clustered around Toronto; ${issues.length} require monitoring (${issues
          .map((unit) => unit.code)
          .join(", ")}).`,
      );
    }
    if (nearChicago.length) {
      const issues = nearChicago.filter((unit) => unit.status !== "onTrack");
      lines.push(
        `${nearChicago.length} units approaching Chicago; ${issues.length} with alerts (${issues
          .map((unit) => unit.code)
          .join(", ") || "none"}).`,
      );
    }
    return lines.length
      ? lines.join(" ")
      : "No tracked equipment is currently inside the Toronto-Chicago corridor.";
  }

  if (/summary|health|status/.test(normalized)) {
    return buildFleetSummary(units, tokens);
  }

  return "Assistant didn't match a known intent — try asking about critical units, fleet health, or a geography.";
}

function computeInsights(units: FleetUnit[], tokens: StatusTokenMap) {
  if (!units.length) {
    return [
      {
        title: "No live telemetry",
        body: "AI monitoring is idle because no units reported a recent ping.",
      },
    ];
  }

  const onTrack = units.filter((unit) => unit.status === "onTrack").length;
  const watch = units.filter((unit) => unit.status === "watch");
  const action = units.filter((unit) => unit.status === "action");

  const riskHotspot = [...watch, ...action]
    .slice(0, 3)
    .map((unit) => `${unit.code} · ${tokens[unit.status].label}`)
    .join(" | ");

  const averageLat = units.reduce((acc, unit) => acc + unit.lat, 0) / units.length;
  const averageLon = units.reduce((acc, unit) => acc + unit.lon, 0) / units.length;

  const dispersion = Math.max(
    ...units.map((unit) => haversineMiles({ lat: unit.lat, lon: unit.lon }, { lat: averageLat, lon: averageLon })),
  );

  const cohesion = clamp(100 - dispersion, 10, 100);

  return [
    {
      title: "Stability score",
      body: `${onTrack}/${units.length} on track · AI cohesion ${cohesion.toFixed(0)}%.`,
    },
    {
      title: "Risk hotspots",
      body: riskHotspot || "AI can't spot any risk clusters yet.",
    },
    {
      title: "Coverage centroid",
      body: `Fleet center near ${formatCoords(averageLat, averageLon)} — adjust dispatch if that drifts too far off lane.`,
    },
    ...(!action.length
      ? [
          {
            title: "Predictive alert",
            body: watch.length
              ? `AI expects ${watch.length} unit${watch.length > 1 ? "s" : ""} might need escalation if conditions worsen.`
              : "Low risk window — route optimization opportunity detected.",
          },
        ]
      : []),
  ];
}

function buildMarkerElement(token: StatusToken) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "fleet-map-marker focus-visible:outline-none";
  element.style.setProperty("--marker-color", token.mapStroke);
  element.setAttribute("aria-label", `${token.label} unit marker`);
  return element;
}

function buildPopupHtml(unit: FleetUnit, token: StatusToken) {
  return `
    <div class="space-y-1 text-[0.7rem] text-white/80">
      <p class="text-xs font-semibold text-white">${unit.driverName || "Unassigned"}</p>
      <p class="text-[0.65rem] uppercase tracking-wide text-white/60">Unit ${unit.code}</p>
      <div class="flex items-center gap-2 text-[0.65rem] text-white/70">
        <span
          class="inline-flex h-2 w-2 rounded-full"
          style="background:${token.mapStroke}; box-shadow:0 0 12px ${token.mapStroke}55"
        ></span>
        <span>${token.label}</span>
      </div>
      <p class="text-[0.65rem] text-white/60">Ping: ${formatCoords(unit.lat, unit.lon)}</p>
      ${unit.lastPingLabel ? `<p class="text-[0.6rem] text-white/50">Last ping ${unit.lastPingLabel}</p>` : ""}
      ${unit.statusDetail ? `<p class="text-[0.6rem] text-white/50">Status: ${unit.statusDetail}</p>` : ""}
    </div>
  `;
}

export function FleetMap({
  units,
  statusTokens,
  laneCallout,
  heightClassName = "h-[460px]",
}: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerBundle>>(new Map());
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

  const renderableUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          Number.isFinite(unit.lat) &&
          Number.isFinite(unit.lon) &&
          unit.lat >= -90 &&
          unit.lat <= 90 &&
          unit.lon >= -180 &&
          unit.lon <= 180,
      ),
    [units],
  );

  const aiInsights = useMemo(() => computeInsights(renderableUnits, statusTokens), [renderableUnits, statusTokens]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 42,
      bearing: -18,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "imperial" }), "bottom-right");

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((bundle) => bundle.marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lastPrompt) {
      return;
    }
    setAiResponse(buildFleetSummary(renderableUnits, statusTokens));
  }, [renderableUnits, statusTokens, lastPrompt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(renderableUnits.map((unit) => unit.id));
    const storedMarkers = markersRef.current;

    // Remove markers that are no longer needed
    for (const [id, bundle] of storedMarkers) {
      if (!existingIds.has(id)) {
        bundle.marker.remove();
        storedMarkers.delete(id);
      }
    }

    renderableUnits.forEach((unit) => {
      const token = statusTokens[unit.status];
      const lngLat: [number, number] = [unit.lon, unit.lat];
      const popupHtml = buildPopupHtml(unit, token);
      const existing = storedMarkers.get(unit.id);

      if (!existing) {
        const element = buildMarkerElement(token);
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18 });
        const marker = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);

        const showPopup = () => {
          popup.setLngLat(lngLat).setHTML(popupHtml).addTo(map);
        };
        const hidePopup = () => {
          popup.remove();
        };

        element.addEventListener("mouseenter", showPopup);
        element.addEventListener("focus", showPopup);
        element.addEventListener("mouseleave", hidePopup);
        element.addEventListener("blur", hidePopup);
        element.addEventListener("click", () => popup.setLngLat(lngLat).setHTML(popupHtml).addTo(map));

        storedMarkers.set(unit.id, { marker, popup, element });
      } else {
        existing.marker.setLngLat(lngLat);
        existing.popup.setLngLat(lngLat).setHTML(popupHtml);
        existing.element.style.setProperty("--marker-color", token.mapStroke);
      }
    });

    if (renderableUnits.length) {
      const bounds = renderableUnits.reduce(
        (acc, unit) => acc.extend([unit.lon, unit.lat]),
        new LngLatBounds([renderableUnits[0].lon, renderableUnits[0].lat], [renderableUnits[0].lon, renderableUnits[0].lat]),
      );
      if (bounds && bounds.isEmpty()) {
        map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
      } else {
        map.fitBounds(bounds, { padding: 100, animate: false });
      }
    } else {
      map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  }, [renderableUnits, statusTokens]);

  const handleAskCopilot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = aiQuery.trim();
    const response = generateAiResponse(trimmed, renderableUnits, statusTokens);
    setAiResponse(response);
    setLastPrompt(trimmed);
    setAiQuery("");
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#070c1a] shadow-[0_30px_120px_rgba(0,0,0,0.8)] ${heightClassName}`}
    >
      <div ref={containerRef} className="fleet-maplibre-container" />

      {laneCallout ? (
        <div className="pointer-events-none absolute left-6 top-6 z-[401]">
          <div className="pointer-events-auto rounded-lg border border-white/15 bg-[#0f1729]/90 px-3 py-2 text-xs text-white/70 shadow-lg shadow-black/50 backdrop-blur">
            <p className="text-sm font-semibold text-white">{laneCallout.title}</p>
            <p className="text-[0.7rem] text-white/60">{laneCallout.subtitle}</p>
            <p className="text-[0.6rem] text-white/50">{laneCallout.meta}</p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-6 top-6 z-[401] w-[280px] max-w-[85vw]">
        <div className="pointer-events-auto space-y-3 rounded-xl border border-white/15 bg-[#0f1729]/95 p-4 text-[0.7rem] text-white/70 shadow-lg shadow-black/60 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-white">Fleet AI Copilot</p>
            <p className="text-[0.65rem] text-white/60">Query live risk intelligence generated from your unit data.</p>
          </div>
          <form onSubmit={handleAskCopilot} className="space-y-2">
            <label htmlFor="ai-query" className="sr-only">
              Ask Fleet Copilot
            </label>
            <div className="flex gap-2">
              <input
                id="ai-query"
                value={aiQuery}
                onChange={(event) => setAiQuery(event.target.value)}
                placeholder="Ask about risks, coverage, ETAs..."
                className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-[0.65rem] text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg bg-emerald-500 px-3 text-[0.65rem] font-semibold text-emerald-950 shadow-[0_0_18px_rgba(52,211,153,0.55)] transition hover:bg-emerald-400"
              >
                Ask
              </button>
            </div>
          </form>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-[0.65rem] text-white/70">
            {aiResponse}
          </div>
          <div className="text-[0.6rem] text-white/40">
            Try: {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setAiQuery(prompt);
                  setLastPrompt("");
                }}
                className="mr-2 mb-1 inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-white/50 hover:border-emerald-400/60 hover:text-emerald-300"
              >
                <span aria-hidden>🤖</span>
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-6 bottom-6 z-[401] w-[320px] max-w-[90vw]">
        <div className="pointer-events-auto space-y-2 rounded-xl border border-white/15 bg-[#0f1729]/95 p-4 text-[0.7rem] text-white/70 shadow-lg shadow-black/60 backdrop-blur">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">AI Insights</p>
          <ul className="space-y-2">
            {aiInsights.map((insight) => (
              <li key={insight.title} className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="text-[0.65rem] font-semibold text-white">{insight.title}</p>
                <p className="text-[0.6rem] text-white/60">{insight.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[401] flex justify-center">
        <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-white/15 bg-[#0f1729]/90 px-4 py-2 text-[0.7rem] text-white/70 shadow-lg shadow-black/50">
          {(Object.entries(statusTokens) as Array<[FleetUnitStatus, StatusToken]>).map(([status, token]) => (
            <span key={status} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: token.mapStroke,
                  boxShadow: `0 0 14px ${token.mapStroke}55`,
                }}
                aria-hidden
              />
              {token.label}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[401] rounded-lg border border-white/15 bg-[#0f1729]/90 px-3 py-1 text-[0.55rem] uppercase tracking-wide text-white/50 shadow-lg shadow-black/50">
        <span>&copy; OpenStreetMap contributors &copy; CARTO</span>
      </div>
    </div>
  );
}

