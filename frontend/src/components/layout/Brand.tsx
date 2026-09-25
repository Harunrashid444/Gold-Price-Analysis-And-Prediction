import { cx } from "../ui/primitives";

/** Brass ingot monogram — the one place the gold theme is stated outright. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cx("size-7 shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="27" height="27" rx="2" fill="#8a6d2f" />
      <path d="M8 19.5 L11 8.5 h6 L20 19.5 Z" fill="#f3e4c0" />
      <path d="M8 19.5 h12 v1.5 H8 Z" fill="#d9c184" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-serif text-[0.9375rem] font-semibold tracking-tight text-ink">
            Gold Price Analytics
          </span>
          <span className="block text-[0.625rem] font-medium tracking-[0.09em] text-ink-3 uppercase">
            Time-series research
          </span>
        </span>
      )}
    </span>
  );
}
