// Acceptance criteria:
// - Renders MapView with units and lane data from helper.
// - Shows side panel summaries for selected markers and lanes.
// - Ensures Decimal values are converted before passing to client.

import { MapView } from "./map-view";
import { getFleetMapData } from "@/server/fleet-map";

export default async function FleetMapPage() {
  const data = await getFleetMapData();
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <h1 className="text-2xl font-semibold text-white">Fleet map</h1>
        <p className="text-sm text-zinc-400">Live units and active lanes (placeholder map)</p>
      </div>
      <MapView units={data.units} lanes={data.lanes} />
    </div>
  );
}
