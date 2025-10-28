"use client";

import { PropsWithChildren, useMemo, useState } from "react";

import SideCommandPanel from "@/src/components/SideCommandPanel";

type PageShellProps = PropsWithChildren<{
  initialExpanded?: boolean;
}>;

export function PageShell({ children, initialExpanded = true }: PageShellProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const sidebarWidth = useMemo(() => (expanded ? 320 : 72), [expanded]);

  const handleToggle = () => setExpanded((prev) => !prev);

  return (
    <div className="flex min-h-screen bg-[#0a0d16] text-white">
      <SideCommandPanel expanded={expanded} onToggle={handleToggle} />
      <main
        className="flex-1 transition-[padding] duration-300 ease-in-out"
        style={{ paddingLeft: sidebarWidth }}
      >
        <div className="px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
