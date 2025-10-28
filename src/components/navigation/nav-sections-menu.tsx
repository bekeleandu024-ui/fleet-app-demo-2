"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import type { NavSection } from "@/src/lib/navigation";

interface NavSectionsMenuProps {
  sections: NavSection[];
}

export default function NavSectionsMenu({ sections }: NavSectionsMenuProps) {
  const panelId = useId();
  const triggerId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 shadow-[0_10px_40px_rgba(15,23,41,0.5)] transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
      >
        {open ? "Close" : "Explore"}
        <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/70 transition-all" aria-hidden />
      </button>
      <div
        id={panelId}
        role="dialog"
        aria-labelledby={triggerId}
        className={`${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        } absolute left-1/2 z-40 mt-3 w-screen max-w-[min(100vw,720px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#0f1729] text-white/80 shadow-[0_40px_120px_rgba(15,23,41,0.65)] transition-opacity duration-200 ease-out`}
      >
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/50">
                  {section.title}
                </div>
                <p className="text-sm text-white/60">{section.blurb}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-emerald-300/40 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/70 transition group-hover:bg-emerald-300" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
