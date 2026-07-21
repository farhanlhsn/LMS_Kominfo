"use client";

import { cn } from "../../lib/utils";

export function SimpleBarChart({
  data,
  className,
  height = 160,
  ariaLabel = "Bar chart",
}: {
  data: { label: string; value: number }[];
  className?: string;
  height?: number;
  ariaLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <>
      <div aria-label={ariaLabel} className={cn("flex items-end gap-1", className)} role="img" style={{ height }}>
        {data.map((d) => (
        <div
          key={d.label}
          className="flex flex-1 flex-col items-center gap-1"
          title={`${d.label}: ${d.value}`}
        >
          <div
            className="w-full rounded-t bg-primary/80 transition-all"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
          />
          <span className="truncate text-[10px] text-muted-foreground" style={{ writingMode: "vertical-lr" } as React.CSSProperties}>
            {d.label}
          </span>
        </div>
        ))}
      </div>
      <ul className="sr-only">
        {data.map((d) => <li key={d.label}>{d.label}: {d.value}</li>)}
      </ul>
    </>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p> : null}
      {trend ? (
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}
        >
          {trend.positive ? "↑" : "↓"} {trend.value}
        </span>
      ) : null}
    </article>
  );
}
