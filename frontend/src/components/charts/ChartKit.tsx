import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cx } from "../ui/primitives";

/** Shared axis styling so every chart in the app reads as one family. */
export const AXIS = {
  stroke: "#d3cdc0",
  tick: { fill: "#86827a", fontSize: 11 },
  tickLine: false,
} as const;

export const GRID = {
  stroke: "#e6e2d9",
  strokeDasharray: "0",
  vertical: false,
} as const;

export const CHART_COLORS = {
  global: "#35505f",
  india: "#9a7b2f",
  brass: "#8a6d2f",
  ink: "#191815",
  muted: "#86827a",
  actual: "#35505f",
  predicted: "#9e3b2c",
  band: "#8a6d2f",
} as const;

/* ------------------------------ Frame ------------------------------ */

interface ChartFrameProps {
  title?: string;
  subtitle?: string;
  legend?: ReactNode;
  height?: number;
  children: ReactNode;
  className?: string;
  footnote?: ReactNode;
}

/**
 * Wraps a chart with its heading and legend. The chart itself sits in a
 * ResponsiveContainer so it reflows on tablet/mobile without fixed widths.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  height = 320,
  children,
  className,
  footnote,
}: ChartFrameProps) {
  return (
    <figure className={cx("rounded-[3px] border border-line bg-surface", className)}>
      {(title || legend) && (
        <figcaption className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <p className="text-[0.8125rem] font-semibold text-ink">{title}</p>}
            {subtitle && <p className="mt-0.5 text-[0.75rem] text-ink-3">{subtitle}</p>}
          </div>
          {legend && <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">{legend}</div>}
        </figcaption>
      )}
      <div className="px-2 pt-4 pb-2 sm:px-3">
        <div style={{ height }} className="tnum">
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        </div>
      </div>
      {footnote && (
        <div className="border-t border-line px-5 py-2.5 text-[0.75rem] leading-relaxed text-ink-3">
          {footnote}
        </div>
      )}
    </figure>
  );
}

/* ------------------------------ Legend ------------------------------ */

export function LegendKey({
  color,
  label,
  variant = "line",
}: {
  color: string;
  label: string;
  variant?: "line" | "dash" | "area" | "dot";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-ink-2">
      {variant === "area" ? (
        <span
          aria-hidden="true"
          className="h-2.5 w-3.5 rounded-[1px]"
          style={{ backgroundColor: color, opacity: 0.22, border: `1px solid ${color}55` }}
        />
      ) : variant === "dot" ? (
        <span
          aria-hidden="true"
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-0 w-3.5"
          style={{
            borderTop: `2px ${variant === "dash" ? "dashed" : "solid"} ${color}`,
          }}
        />
      )}
      {label}
    </span>
  );
}

/* ------------------------------ Tooltip ------------------------------ */

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Consistent tooltip shell — the charts supply already-formatted rows. */
export function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="tnum min-w-[9rem] rounded-[3px] border border-line-2 bg-surface px-3 py-2 shadow-[0_2px_8px_rgba(25,24,21,0.08)]">
      <p className="mb-1.5 border-b border-line pb-1.5 text-[0.75rem] font-semibold text-ink">
        {title}
      </p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-[0.75rem]">
            <span className="inline-flex items-center gap-1.5 text-ink-3">
              {row.color && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="font-medium text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TOOLTIP_CURSOR = {
  stroke: "#86827a",
  strokeWidth: 1,
  strokeDasharray: "3 3",
} as const;
