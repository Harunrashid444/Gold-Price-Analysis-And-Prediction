import type { ReactNode } from "react";
import { cx } from "./primitives";
import { InfoHint } from "./primitives";

/**
 * A labelled figure. Grouped inside <StatRow> they form a hairline-separated
 * band rather than a row of floating cards.
 */
export function Stat({
  label,
  value,
  detail,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "brass";
  className?: string;
}) {
  const valueTone =
    tone === "positive"
      ? "text-pos"
      : tone === "negative"
        ? "text-neg"
        : tone === "brass"
          ? "text-brass"
          : "text-ink";

  return (
    <div className={cx("bg-surface p-5", className)}>
      <p className="eyebrow flex items-center">
        {label}
        {hint && <InfoHint text={hint} />}
      </p>
      <p className={cx("tnum mt-2 font-serif text-[1.5rem] leading-none font-semibold", valueTone)}>
        {value}
      </p>
      {detail && <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-3">{detail}</p>}
    </div>
  );
}

export function StatRow({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-3";

  return (
    <div className={cx("grid gap-px overflow-hidden rounded-[3px] border border-line bg-line", cols)}>
      {children}
    </div>
  );
}
