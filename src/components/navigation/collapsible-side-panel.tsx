"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

import type { NavSection } from "@/src/lib/navigation";

function getInitialState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(min-width: 1024px)").matches;
}

export default function CollapsibleNavPanel({ sections }: { sections: NavSection[] }) {
  const [isOpen, setIsOpen] = useState(getInitialState);
  const panelId = useId();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsOpen(event.matches);
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
    <aside
      className={`w-full transition-[flex-basis] duration-300 ease-out lg:flex-shrink-0 ${
        isOpen ? "lg:basis-80" : "lg:basis-16"
      }`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navigate</div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-controls={panelId}
            aria-expanded={isOpen}
            className="rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300 transition hover:border-emerald-500/60 hover:text-white"
          >
            {isOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        <div
          id={panelId}
          className={`mt-4 space-y-6 overflow-y-auto pr-2 ${isOpen ? "" : "hidden"}`}
          aria-hidden={!isOpen}
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
          aria-hidden={isOpen}
          className={`mt-6 flex flex-col gap-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500 ${
            isOpen ? "hidden" : ""
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
