import FleetMapCard, { UnitPing } from "@/app/components/FleetMapCard";

export default function Page() {
  const samplePings: UnitPing[] = [
    {
      id: "u1",
      driverName: "Singh",
      unitLabel: "Truck 104",
      status: "onTrack",
      lat: 43.6532,
      lon: -79.3832,
      laneName: "Toronto ⇄ Chicago lane",
      laneSummary: "522 mi · 9.2 hr drive",
      rpmInfo: "RPM 2.21 · Source DAT",
    },
    {
      id: "u2",
      driverName: "Lopez",
      unitLabel: "Truck 207",
      status: "onTrack",
      lat: 42.3314,
      lon: -83.0458,
      laneName: "Toronto ⇄ Chicago lane",
      laneSummary: "522 mi · 9.2 hr drive",
      rpmInfo: "RPM 2.21 · Source DAT",
    },
    {
      id: "u3",
      driverName: "Chen",
      unitLabel: "Truck 311",
      status: "watch",
      lat: 41.8781,
      lon: -87.6298,
      laneName: "Toronto ⇄ Chicago lane",
      laneSummary: "522 mi · 9.2 hr drive",
      rpmInfo: "RPM 2.21 · Source DAT",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0d16] text-white p-6">
      <FleetMapCard pings={samplePings} />
    </main>
  );
}
