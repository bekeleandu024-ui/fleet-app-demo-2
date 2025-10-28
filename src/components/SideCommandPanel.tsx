"use client";

import { ButtonHTMLAttributes, ComponentType } from "react";
import {
  BarChart3,
  Calculator,
  Gauge,
  IdCard,
  Inbox,
  LineChart,
  MapPin,
  NotebookPen,
  Radio,
  Route,
  Scale,
  Shield,
  Truck,
} from "lucide-react";

const SECTIONS = [
  {
    title: "OPERATIONS",
    subtitle: "Real-time tools for managing freight in motion.",
    links: [
      { label: "Dispatch Console", icon: Radio },
      { label: "Book Loads", icon: NotebookPen },
      { label: "Trips Board", icon: Route },
      { label: "Orders Intake", icon: Inbox },
      { label: "Live Fleet Map", icon: MapPin },
    ],
  },
  {
    title: "PLANNING",
    subtitle: "Balance demand, supply, and profitability before wheels move.",
    links: [
      { label: "Plan & Price", icon: Calculator },
      { label: "Rates & Guardrails", icon: Scale },
      { label: "Driver Roster", icon: IdCard },
      { label: "Available Units", icon: Truck },
    ],
  },
  {
    title: "INSIGHTS",
    subtitle: "Surface trends that inform tactical and strategic moves.",
    links: [
      { label: "Analytics Overview", icon: LineChart },
      { label: "Margin & Dwell", icon: BarChart3 },
    ],
  },
  {
    title: "GOVERNANCE",
    subtitle: "Configure guardrails and keep compliance tight.",
    links: [
      { label: "Admin Controls", icon: Shield },
      { label: "Fleet Overview", icon: Gauge },
    ],
  },
] as const;

export type SideCommandPanelProps = {
  expanded: boolean;
  onToggle: () => void;
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ExpandedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

const GreenDot = () => (
  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
);

const CollapsedIconButton = ({ icon: Icon, label, ...props }: IconButtonProps) => (
  <button
    type="button"
    title={label}
    className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10"
    {...props}
  >
    <Icon className="h-5 w-5" />
    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
  </button>
);

const ExpandedPillButton = ({ label, ...props }: ExpandedButtonProps) => (
  <button
    type="button"
    className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
    {...props}
  >
    <GreenDot />
    <span>{label}</span>
  </button>
);

export default function SideCommandPanel({ expanded, onToggle }: SideCommandPanelProps) {
  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/10 bg-[#05070d] transition-all duration-300 ease-in-out ${expanded ? "w-[320px]" : "w-[72px]"}`}
    >
      <div className="border-b border-white/10 px-3 py-4">
        {expanded ? (
          <div className="flex items-center justify-between gap-3">
            <div className="overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white">Command Hub</div>
              <p className="mt-1 text-[11px] text-white/50">Orchestrate the fleet without losing the signal.</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              <span>&lt;&lt;</span>
              <span>Hide</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Expand command hub"
            >
              <span>&gt;&gt;</span>
            </button>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto pb-8 ${expanded ? "px-4 pt-6" : "px-2 pt-4"}`}>
        {SECTIONS.map((section, index) => (
          <div
            key={section.title}
            className={`transition-colors duration-200 ease-in-out ${
              expanded ? "space-y-2" : `flex flex-col items-center gap-3 py-4 ${index !== 0 ? "border-t border-white/10" : ""}`
            }`}
          >
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expanded ? "max-h-[400px] opacity-100 translate-y-0" : "pointer-events-none max-h-0 opacity-0 -translate-y-2"
              }`}
              aria-hidden={!expanded}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">{section.title}</div>
              <p className="mt-2 text-xs text-white/60">{section.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <ExpandedPillButton key={link.label} label={link.label} />
                ))}
              </div>
            </div>

            <div
              className={`flex flex-col items-center gap-3 transition-all duration-300 ease-in-out ${
                expanded
                  ? "pointer-events-none max-h-0 opacity-0 translate-y-2"
                  : "max-h-[400px] opacity-100 translate-y-0 py-1"
              }`}
              aria-hidden={expanded}
            >
              {section.links.map((link) => (
                <CollapsedIconButton key={link.label} label={link.label} icon={link.icon} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
