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
      className={`w-full transition-all duration-300 ease-out lg:-ml-6 lg:flex-shrink-0 ${
        collapsed ? "lg:w-[60px]" : "lg:w-[220px]"
      }`}
      aria-expanded={!collapsed}
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-xl shadow-black/40 ${
          collapsed ? "items-center px-2 py-4" : "p-4"
        }`}
      >
        <div
          className={`flex w-full items-center gap-3 ${collapsed ? "justify-center" : "justify-between"}`}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 ${
              collapsed ? "sr-only" : ""
            }`}
          >
            Navigate
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-controls={panelId}
            aria-expanded={!collapsed}
            className={`rounded-full border border-slate-800/80 bg-slate-900/80 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-emerald-500/60 hover:text-white ${
              collapsed ? "px-2 py-1" : "px-3 py-1"
            }`}
          >
            {collapsed ? "EXPAND" : "COLLAPSE"}
          </button>
        </div>
        <div
          id={panelId}
          className={`mt-4 space-y-6 overflow-y-auto pr-2 ${collapsed ? "hidden" : ""}`}
          aria-hidden={collapsed}
        >
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{section.title}</div>
              <p className="text-sm text-slate-400">{section.blurb}</p>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group inline-flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/60 hover:text-white"
                  >
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500/60 transition group-hover:bg-emerald-400" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          aria-hidden={!collapsed ? true : undefined}
          className={`mt-6 flex flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 ${
            collapsed ? "" : "hidden"
          }`}
        >
          {sections.map((section) => (
            <span key={section.title} className="rotate-180 text-center [writing-mode:vertical-rl]">
              {section.title}
            </span>
          ))}
        </div>
        <span className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" aria-hidden />
      </div>
    </aside>
  );
}
