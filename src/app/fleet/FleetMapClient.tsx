"use client";

import dynamic from "next/dynamic";

import type { FleetMapProps } from "@/components/FleetMap";

const DynamicFleetMap = dynamic<FleetMapProps>(() => import("@/components/FleetMap"), {
  ssr: false,
});

export default function FleetMapClient(props: FleetMapProps) {
  return <DynamicFleetMap {...props} />;
}
