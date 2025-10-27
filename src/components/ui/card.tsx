import * as React from "react";

function cx(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={cx("card p-5", className)}>{children}</section>;
}

export function CardHeader({ children }: React.PropsWithChildren) {
  return <div className="mb-3 flex items-center justify-between">{children}</div>;
}

export function CardTitle({ children }: React.PropsWithChildren) {
  return <h3 className="card-title">{children}</h3>;
}

export function CardContent({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cx(className)}>{children}</div>;
}
