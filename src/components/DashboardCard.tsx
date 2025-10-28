import type { ReactNode } from "react";

interface DashboardCardProps {
  title: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardCard({
  title,
  description,
  headerRight,
  children,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={classNames(
        "rounded-xl border border-white/10 bg-[#0f1729] p-5 text-white shadow-[0_30px_120px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {(title || description || headerRight) && (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold leading-6 tracking-wide text-white">{title}</h2>
            {description ? <p className="text-xs leading-5 text-white/60">{description}</p> : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </header>
      )}
      <div className={classNames(title || description || headerRight ? "mt-4" : "", "space-y-0")}>{children}</div>
    </section>
  );
}
