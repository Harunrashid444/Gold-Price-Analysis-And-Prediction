import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- Button ------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-canvas border border-ink hover:bg-black disabled:hover:bg-ink",
  secondary:
    "bg-surface text-ink border border-line-2 hover:border-ink hover:bg-sunken disabled:hover:border-line-2 disabled:hover:bg-surface",
  ghost:
    "bg-transparent text-ink-2 border border-transparent hover:text-ink hover:bg-sunken",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[3px] px-4 py-2.5",
        "text-[0.8125rem] font-medium tracking-[0.01em]",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-45",
        fullWidth && "w-full",
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- Input -------------------------------- */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[0.8125rem] font-medium text-ink-2">
        {label}
      </label>
      <input
        {...rest}
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "w-full rounded-[3px] border bg-surface px-3 py-2.5 text-[0.875rem] text-ink",
          "placeholder:text-ink-3/70",
          "transition-colors duration-150",
          "focus:outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/15",
          error ? "border-neg" : "border-line-2 hover:border-ink-3",
          className,
        )}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-[0.75rem] text-neg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[0.75rem] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/* -------------------------------- Panel -------------------------------- */

/** A plain bordered surface. Used sparingly — most hierarchy comes from
 *  typography and whitespace rather than boxing everything in. */
export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-[3px] border border-line bg-surface",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Section ------------------------------- */

export function Section({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="max-w-2xl space-y-1.5">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="font-serif text-[1.375rem] leading-tight font-semibold text-ink">
            {title}
          </h2>
          {description && (
            <p className="text-[0.8125rem] leading-relaxed text-ink-2">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/* -------------------------------- Badge -------------------------------- */

type BadgeTone = "neutral" | "positive" | "negative" | "brass";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-line-2 bg-sunken text-ink-2",
  positive: "border-pos/25 bg-pos/8 text-pos",
  negative: "border-neg/25 bg-neg/8 text-neg",
  brass: "border-brass/30 bg-brass-wash text-brass",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5",
        "text-[0.6875rem] font-medium tracking-wide",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ InfoHint ------------------------------- */

/** Small "?" affordance carrying a plain-language explanation of a statistic.
 *  Uses native title + accessible label — no popover library needed. */
export function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      tabIndex={0}
      className={cx(
        "ml-1 inline-flex size-3.5 shrink-0 cursor-help items-center justify-center",
        "rounded-full border border-line-2 text-[0.5625rem] font-semibold text-ink-3 align-middle",
        "transition-colors hover:border-brass hover:text-brass",
      )}
    >
      ?
    </span>
  );
}
