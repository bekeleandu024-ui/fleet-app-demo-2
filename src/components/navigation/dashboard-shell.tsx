import type { PropsWithChildren } from "react";

interface DashboardShellProps extends PropsWithChildren {}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 pb-10 pt-8">
      {children}
    </main>
  );
}
