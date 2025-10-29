"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DashboardCard from "@/src/components/DashboardCard";
import type { TripEventType } from "@/src/types/trip";

const EVENT_LABELS: Record<TripEventType, string> = {
  TRIP_START: "Trip Start",
  ARRIVED_PICKUP: "Pickup - Arrived",
  LEFT_PICKUP: "Pickup - Departed",
  ARRIVED_DELIVERY: "Delivery - Arrived",
  LEFT_DELIVERY: "Delivery - Departed",
  CROSSED_BORDER: "Border Crossing",
  DROP_HOOK: "Drop / Hook",
  TRIP_FINISHED: "Trip Finished",
};

const EVENT_BADGES: Partial<Record<TripEventType, string>> = {
  TRIP_START: "bg-emerald-400/20 text-emerald-100 border-emerald-400/30",
  TRIP_FINISHED: "bg-sky-400/20 text-sky-100 border-sky-400/30",
  CROSSED_BORDER: "bg-amber-400/20 text-amber-100 border-amber-400/30",
  DROP_HOOK: "bg-purple-400/20 text-purple-100 border-purple-400/30",
};

const QUICK_ACTIONS: TripEventType[] = [
  "TRIP_START",
  "CROSSED_BORDER",
  "DROP_HOOK",
  "ARRIVED_DELIVERY",
  "LEFT_DELIVERY",
  "TRIP_FINISHED",
];

const FEED_EVENT_TYPES: { value: "" | TripEventType; label: string }[] = [
  { value: "", label: "All events" },
  { value: "TRIP_START", label: "Trip Start" },
  { value: "ARRIVED_PICKUP", label: "Pickup - Arrived" },
  { value: "LEFT_PICKUP", label: "Pickup - Departed" },
  { value: "ARRIVED_DELIVERY", label: "Delivery - Arrived" },
  { value: "LEFT_DELIVERY", label: "Delivery - Departed" },
  { value: "CROSSED_BORDER", label: "Border Crossing" },
  { value: "DROP_HOOK", label: "Drop / Hook" },
  { value: "TRIP_FINISHED", label: "Trip Finished" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

interface TripOption {
  id: string;
  driver: string | null;
  unit: string | null;
  status: string | null;
  origin: string | null;
  destination: string | null;
}

interface FeedTripInfo {
  id: string;
  driver: string | null;
  unit: string | null;
  status: string | null;
  order?: {
    origin: string | null;
    destination: string | null;
  } | null;
}

interface FeedEvent {
  id: string;
  tripId: string;
  eventType: TripEventType;
  at: string;
  stopLabel: string | null;
  notes: string | null;
  lat: number | null;
  lon: number | null;
  trip: FeedTripInfo | null;
}

interface FeedSummary {
  uniqueTrips: number;
  borderCrossings: number;
  completedTrips: number;
}

interface TripEventConsoleProps {
  initialTrips: TripOption[];
  initialEvents: FeedEvent[];
  initialSummary: FeedSummary;
  initialSelectedTripId: string | null;
}

type FeedFilters = {
  tripId: string;
  driver: string;
  unit: string;
  eventType: "" | TripEventType;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load trip events");
  }
  return (await response.json()) as { events: FeedEvent[]; summary: FeedSummary };
};

function buildQuery(filters: FeedFilters) {
  const params = new URLSearchParams();
  if (filters.tripId) params.set("tripId", filters.tripId);
  if (filters.driver) params.set("driver", filters.driver);
  if (filters.unit) params.set("unit", filters.unit);
  if (filters.eventType) params.set("eventType", filters.eventType);
  const query = params.toString();
  return query ? `/api/trip-events?${query}` : "/api/trip-events";
}

export default function TripEventConsole({
  initialTrips,
  initialEvents,
  initialSummary,
  initialSelectedTripId,
}: TripEventConsoleProps) {
  const [selectedTripId, setSelectedTripId] = useState(initialSelectedTripId ?? "");
  const [locationLabel, setLocationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [latInput, setLatInput] = useState<string>("");
  const [lonInput, setLonInput] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loggingEvent, setLoggingEvent] = useState<TripEventType | null>(null);

  const initialFilters = useMemo<FeedFilters>(
    () => ({
      tripId: initialSelectedTripId ?? "",
      driver: "",
      unit: "",
      eventType: "",
    }),
    [initialSelectedTripId],
  );
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);

  const feedKey = useMemo(() => buildQuery(filters), [filters]);
  const initialKey = useMemo(() => buildQuery(initialFilters), [initialFilters]);
  const [feedData, setFeedData] = useState<{ events: FeedEvent[]; summary: FeedSummary }>(() => ({
    events: initialEvents,
    summary: initialSummary,
  }));
  const [isLoading, setIsLoading] = useState(feedKey !== initialKey);
  const [error, setError] = useState<Error | null>(null);

  const fetchLatest = useCallback(
    async ({
      showLoading = true,
      cancelledRef,
    }: { showLoading?: boolean; cancelledRef?: { current: boolean } } = {}) => {
      if (cancelledRef?.current) {
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const result = await fetcher(feedKey);
        if (cancelledRef?.current) {
          return;
        }

        setFeedData(result);
        setError(null);
      } catch (fetchError) {
        if (cancelledRef?.current) {
          return;
        }

        setError(fetchError as Error);
      } finally {
        if (showLoading && !cancelledRef?.current) {
          setIsLoading(false);
        }
      }
    },
    [feedKey],
  );

  const mutate = useCallback(async () => {
    try {
      await fetchLatest();
    } catch {
      /* noop */
    }
  }, [fetchLatest]);

  useEffect(() => {
    const cancelledRef = { current: false };

    if (feedKey === initialKey) {
      setFeedData({ events: initialEvents, summary: initialSummary });
      setError(null);
      setIsLoading(false);
    } else {
      fetchLatest({ cancelledRef }).catch(() => {
        /* handled via state */
      });
    }

    const interval = setInterval(() => {
      fetchLatest({ showLoading: false, cancelledRef }).catch(() => {
        /* handled via state */
      });
    }, 15_000);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [fetchLatest, feedKey, initialEvents, initialSummary, initialKey]);

  const summary = feedData.summary;
  const events = feedData.events;

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setLatInput(latitude.toFixed(6));
        setLonInput(longitude.toFixed(6));
      },
      () => {
        /* noop */
      },
      { enableHighAccuracy: true, timeout: 5_000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, tripId: selectedTripId }));
  }, [selectedTripId]);

  const selectedTrip = initialTrips.find((trip) => trip.id === selectedTripId) ?? null;

  const resolvedLat = useMemo(() => {
    if (latInput.trim()) {
      const parsed = Number(latInput);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return coords?.lat ?? null;
  }, [latInput, coords]);

  const resolvedLon = useMemo(() => {
    if (lonInput.trim()) {
      const parsed = Number(lonInput);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return coords?.lon ?? null;
  }, [lonInput, coords]);

  async function logEvent(eventType: TripEventType) {
    if (!selectedTripId) {
      alert("Select a trip before logging events.");
      return;
    }
    setLoggingEvent(eventType);
    try {
      const response = await fetch(`/api/trips/${selectedTripId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          stopLabel: locationLabel.trim() || null,
          notes: notes.trim() || null,
          lat: resolvedLat,
          lon: resolvedLon,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to log event");
      }
      await mutate();
      setNotes("");
    } catch (logError) {
      console.error(logError);
      alert("Unable to log trip event. Please try again.");
    } finally {
      setLoggingEvent(null);
    }
  }

  function renderBadge(eventType: TripEventType) {
    const tone = EVENT_BADGES[eventType] ?? "bg-white/10 text-white border-white/10";
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {EVENT_LABELS[eventType] ?? eventType.replace("_", " ")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardCard
        title="Trip Event Monitor"
        description="Log milestones and watch dispatch impact in real time."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Unique trips touched</div>
            <div className="mt-2 text-2xl font-semibold text-white">{summary.uniqueTrips}</div>
            <div className="text-[11px] text-white/60">Based on current feed filters.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Border crossings</div>
            <div className="mt-2 text-2xl font-semibold text-white">{summary.borderCrossings}</div>
            <div className="text-[11px] text-white/60">Triggers add-on costing + guardrails.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Trips completed</div>
            <div className="mt-2 text-2xl font-semibold text-white">{summary.completedTrips}</div>
            <div className="text-[11px] text-white/60">Marked finished in this window.</div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Log trip milestone"
        description="Choose a booked trip, confirm location, and log the touch with one click."
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="flex flex-col gap-4">
            <label className="text-xs uppercase tracking-wide text-white/60">
              Select trip
              <select
                value={selectedTripId}
                onChange={(event) => setSelectedTripId(event.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">Choose a trip…</option>
                {initialTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.id.slice(0, 8).toUpperCase()} • {trip.driver ?? "Unassigned"} ({trip.unit ?? "—"})
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-xs text-white/70">
              {selectedTrip ? (
                <div className="space-y-1">
                  <div className="font-semibold text-white">{selectedTrip.driver ?? "Driver TBD"}</div>
                  <div>Unit {selectedTrip.unit ?? "—"} · Status {selectedTrip.status ?? "Created"}</div>
                  <div className="text-white/60">
                    {selectedTrip.origin ?? "—"} → {selectedTrip.destination ?? "—"}
                  </div>
                  <Link
                    href={`/trips/${selectedTrip.id}`}
                    className="inline-flex items-center text-[11px] font-medium text-sky-300 hover:text-sky-200"
                  >
                    View trip details ↗
                  </Link>
                </div>
              ) : (
                <div>Pick a trip to activate quick actions and feed filters.</div>
              )}
            </div>

            <label className="text-xs uppercase tracking-wide text-white/60">
              Location description
              <input
                type="text"
                value={locationLabel}
                onChange={(event) => setLocationLabel(event.target.value)}
                placeholder="City, facility, or intersection"
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs uppercase tracking-wide text-white/60">
                Latitude
                <input
                  type="text"
                  inputMode="decimal"
                  value={latInput}
                  onChange={(event) => setLatInput(event.target.value)}
                  placeholder="e.g. 35.2271"
                  className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-white/60">
                Longitude
                <input
                  type="text"
                  inputMode="decimal"
                  value={lonInput}
                  onChange={(event) => setLonInput(event.target.value)}
                  placeholder="e.g. -80.8431"
                  className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </label>
            </div>

            <label className="text-xs uppercase tracking-wide text-white/60">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Detention, weather, guardrail context…"
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setLatInput(coords ? coords.lat.toFixed(6) : "");
                setLonInput(coords ? coords.lon.toFixed(6) : "");
              }}
              className="inline-flex w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Use current GPS snapshot
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={!selectedTripId || loggingEvent === action}
                  onClick={() => logEvent(action)}
                  className={`rounded-md border px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/40 ${
                    selectedTripId
                      ? "border-white/15 bg-emerald-500/10 text-white hover:bg-emerald-500/20"
                      : "cursor-not-allowed border-white/5 bg-white/5 text-white/40"
                  } ${loggingEvent === action ? "animate-pulse" : ""}`}
                >
                  {EVENT_LABELS[action]}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/60">
              Events are immutable for dispatchers. Admin corrections happen in the data console.
              Trip start moves the load to In Progress; departing final delivery or finishing marks it
              Completed automatically.
            </p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Recent trip events"
        description="Newest first. Filter by trip, driver, unit, or event type."
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="md:col-span-2 text-xs uppercase tracking-wide text-white/60">
              Filter by trip
              <select
                value={filters.tripId}
                onChange={(event) => setFilters((prev) => ({ ...prev, tripId: event.target.value }))}
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">All trips</option>
                {initialTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.id.slice(0, 8).toUpperCase()} • {trip.driver ?? "Unassigned"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Driver
              <input
                type="text"
                value={filters.driver}
                onChange={(event) => setFilters((prev) => ({ ...prev, driver: event.target.value }))}
                placeholder="Search"
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Unit
              <input
                type="text"
                value={filters.unit}
                onChange={(event) => setFilters((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="Search"
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-white/60">
              Event type
              <select
                value={filters.eventType}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, eventType: event.target.value as FeedFilters["eventType"] }))
                }
                className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                {FEED_EVENT_TYPES.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <div>
              Showing {events.length} events · {isLoading ? "Refreshing…" : "Live"}
              {error ? <span className="ml-2 text-rose-300">Error loading feed</span> : null}
            </div>
            <button
              type="button"
              onClick={() => setFilters({ ...initialFilters })}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-white transition hover:bg-white/10"
            >
              Reset filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Driver · Unit</th>
                  <th className="px-4 py-3 font-medium">Location / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map((event) => {
                  const eventType = event.eventType;
                  const trip = event.trip;
                  const locationSummary = event.stopLabel || "—";
                  return (
                    <tr key={event.id} className="transition hover:bg-white/5">
                      <td className="whitespace-nowrap px-4 py-3 text-white">
                        {dateFormatter.format(new Date(event.at))}
                      </td>
                      <td className="px-4 py-3">{renderBadge(eventType)}</td>
                      <td className="px-4 py-3 text-white">
                        {trip ? (
                          <div className="flex flex-col">
                            <Link href={`/trips/${trip.id}`} className="text-sm font-medium text-sky-200 hover:text-sky-100">
                              {trip.id}
                            </Link>
                            <span className="text-xs text-white/60">Status: {trip.status ?? "Unknown"}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-medium">{event.tripId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        <div className="flex flex-col">
                          <span>{trip?.driver ?? "Unassigned"}</span>
                          <span className="text-xs text-white/60">{trip?.unit ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        <div className="space-y-1">
                          <div>{locationSummary}</div>
                          {event.notes ? (
                            <div className="text-xs italic text-white/60">{event.notes}</div>
                          ) : null}
                          {typeof event.lat === "number" && typeof event.lon === "number" ? (
                            <div className="text-xs text-white/50">
                              Coords {event.lat.toFixed(3)}, {event.lon.toFixed(3)}
                            </div>
                          ) : null}
                          {trip?.order?.origin || trip?.order?.destination ? (
                            <div className="text-xs text-white/40">
                              Lane {trip?.order?.origin ?? "—"} → {trip?.order?.destination ?? "—"}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-white/60">
                      No trip events recorded for this filter set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
