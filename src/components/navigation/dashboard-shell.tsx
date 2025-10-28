"use client";

import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";

import type { NavSection } from "@/src/lib/navigation";

import CollapsibleNavPanel from "./collapsible-side-panel";

interface DashboardShellProps extends PropsWithChildren {
  sections: NavSection[];
}

export default function DashboardShell({ sections, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setCollapsed(!event.matches);
    };

    update(media);

    const listener = (event: MediaQueryListEvent) => update(event);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-8 lg:flex-row lg:gap-8">
      <CollapsibleNavPanel
        sections={sections}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <main className={`flex-1 pb-10 transition-[margin] duration-300 ease-out ${collapsed ? "lg:ml-0" : "lg:ml-6"}`}>
        {children}
      </main>
    </div>
  );
}
