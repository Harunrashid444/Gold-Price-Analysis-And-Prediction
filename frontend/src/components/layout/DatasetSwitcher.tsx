import { useDataset } from "../../context/DatasetContext";
import type { DatasetKey } from "../../api/types";
import { cx } from "../ui/primitives";

const OPTIONS: Array<{ key: DatasetKey; label: string; sub: string }> = [
  { key: "global", label: "Global", sub: "USD" },
  { key: "india", label: "India", sub: "INR" },
];

/** Segmented control driving every dataset-aware page. */
export function DatasetSwitcher() {
  const { dataset, setDataset } = useDataset();

  return (
    <div
      role="radiogroup"
      aria-label="Select market"
      className="inline-flex items-center rounded-[3px] border border-line-2 bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = dataset === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDataset(option.key)}
            className={cx(
              "inline-flex items-baseline gap-1.5 rounded-[2px] px-3 py-1.5",
              "text-[0.8125rem] font-medium transition-colors duration-150",
              active
                ? "bg-ink text-canvas"
                : "text-ink-2 hover:bg-sunken hover:text-ink",
            )}
          >
            {option.label}
            <span
              className={cx(
                "text-[0.625rem] font-normal tracking-wide",
                active ? "text-canvas/60" : "text-ink-3",
              )}
            >
              {option.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
