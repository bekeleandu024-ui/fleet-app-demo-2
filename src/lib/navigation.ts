export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type NavSection = {
  title: string;
  blurb: string;
  links: NavLink[];
};

export const TOP_NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/" },
  { label: "Book Trip", href: "/book" },
  { label: "Orders", href: "/orders" },
  { label: "Trips", href: "/trips" },
  { label: "Units", href: "/units" },
  { label: "Drivers", href: "/drivers" },
  { label: "Map", href: "/map" },
  { label: "Analytics", href: "/analytics" },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    blurb: "Real-time tools for managing freight in motion.",
    links: [
      { label: "Dispatch Console", href: "/dispatch" },
      { label: "Book Loads", href: "/book" },
      { label: "Trips Board", href: "/trips" },
      { label: "Orders Intake", href: "/orders" },
      { label: "Live Fleet Map", href: "/map" },
    ],
  },
  {
    title: "Planning",
    blurb: "Balance demand, supply, and profitability before wheels move.",
    links: [
      { label: "Plan & Price", href: "/plan" },
      { label: "Rates & Guardrails", href: "/rates" },
      { label: "Driver Roster", href: "/drivers" },
      { label: "Available Units", href: "/units" },
    ],
  },
  {
    title: "Insights",
    blurb: "Surface trends that inform tactical and strategic moves.",
    links: [
      { label: "Analytics Overview", href: "/analytics" },
      { label: "Margin & Dwell", href: "/insights" },
    ],
  },
  {
    title: "Governance",
    blurb: "Configure guardrails and keep compliance tight.",
    links: [
      { label: "Admin Controls", href: "/admin" },
      { label: "Fleet Overview", href: "/fleet" },
    ],
  },
];
