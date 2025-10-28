"use client";

import { useId } from "react";
import Link from "next/link";

import type { NavSection } from "@/src/lib/navigation";

interface CollapsibleNavPanelProps {
  sections: NavSection[];
  collapsed: boolean;
  onToggle: () => void;
}

export default function CollapsibleNavPanel({ sections, collapsed, onToggle }: CollapsibleNavPanelProps) {
  const panelId = useId();

  return (
    <aside
      className={`w-full transition-all duration-300 ease-out lg:flex-shrink-0 ${collapsed ? "lg:w-[64px]" : "lg:w-[240px]"}`}
      aria-expanded={!collapsed}
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f1729] p-4 text-white/70 shadow-[0_30px_120px_rgba(0,0,0,0.8)] ${
          collapsed ? "items-center gap-4" : "gap-6"
        }`}
      >
        <div className={`flex w-full items-center gap-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50 ${collapsed ? "sr-only" : ""}`}>
            Navigate
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-controls={panelId}
            aria-expanded={!collapsed}
            className={`rounded-md border border-white/15 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/30 hover:text-white/80 ${
              collapsed ? "px-2 py-1" : "px-3 py-1"
            }`}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        <div
          id={panelId}
          className={`flex-1 space-y-6 overflow-y-auto pr-1 ${collapsed ? "hidden" : ""}`}
          aria-hidden={collapsed}
        >
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">{section.title}</div>
              <p className="text-sm text-white/60">{section.blurb}</p>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-emerald-300/40 hover:text-white"
                  >
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/70 transition group-hover:bg-emerald-300" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          aria-hidden={!collapsed ? true : undefined}
          className={`mt-2 flex flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40 ${
            collapsed ? "" : "hidden"
          }`}
        >
          {sections.map((section) => (
            <span key={section.title} className="rotate-180 text-center [writing-mode:vertical-rl]">
              {section.title}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
