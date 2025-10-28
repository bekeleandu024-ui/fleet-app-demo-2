export type TripEventType =
  | "TRIP_START"
  | "ARRIVED_PICKUP"
  | "LEFT_PICKUP"
  | "ARRIVED_DELIVERY"
  | "LEFT_DELIVERY"
  | "CROSSED_BORDER"
  | "DROP_HOOK"
  | "TRIP_FINISHED";

export interface TripStopOption {
  id: string;
  seq: number;
  stopType: string;
  name?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface TripCostingSnapshot {
  id: string;
  driver: string | null;
  unit: string | null;
  status: string | null;
  miles: number;
  revenue: number;
  expectedRevenue: number;
  fixedCPM: number;
  wageCPM: number;
  rollingCPM: number;
  addOnsCPM: number;
  totalVariableCPM: number;
  totalCPM: number;
  variableCost: number;
  fixedCost: number;
  totalCost: number;
  profit: number;
  marginPct: number;
  borderCrossings: number;
  pickups: number;
  deliveries: number;
  dropHooks: number;
}

export interface LoggedTripEvent {
  id: string;
  tripId: string;
  eventType: TripEventType;
  stopId: string | null;
  stopLabel: string | null;
  odometerMiles: number | null;
  lat: number | null;
  lon: number | null;
  at: string;
}

export interface TripEventLogResponse {
  success: true;
  trip: TripCostingSnapshot;
  event: LoggedTripEvent;
}
