import type { ReactNode } from "react";
import { ApiError } from "../../api/client";
import { Button, Panel, cx } from "./primitives";

/* ------------------------------ Skeletons ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-[2px] bg-sunken", className)} />;
}

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-3 w-32" />
      <div className="animate-pulse rounded-[2px] bg-sunken" style={{ height: height - 28 }} />
    </div>
  );
}

/** Page-level placeholder: a couple of stat blocks above a chart area. */
export function PageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading data">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-3 w-96" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 bg-surface p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/* ----------------------------- Error state ----------------------------- */

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: ApiError | Error;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const status = error instanceof ApiError ? error.status : undefined;

  const heading =
    status === 0
      ? "Cannot reach the API"
      : status === 404
        ? "Not found"
        : status === 401
          ? "Session expired"
          : "Something went wrong";

  const help =
    status === 0
      ? "The backend does not appear to be running. Start it with `npm start` in the backend folder, then retry."
      : status === 500
        ? "The API returned an error. It may be missing data/web/pipeline_results.json — run `python export_web_results.py` from the project root."
        : error.message;

  return (
    <Panel className={cx("border-neg/25 bg-neg/4", compact && "p-4")}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-neg/40 text-[0.6875rem] font-bold text-neg"
        >
          !
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-[0.875rem] font-semibold text-ink">{heading}</p>
          <p className="text-[0.8125rem] leading-relaxed text-ink-2">{help}</p>
          {status !== undefined && status > 0 && (
            <p className="font-mono text-[0.6875rem] text-ink-3">HTTP {status}</p>
          )}
          {onRetry && (
            <Button variant="secondary" onClick={onRetry} className="mt-1">
              Retry
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------- Empty state ----------------------------- */

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-2 bg-surface px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="text-[0.875rem] font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-ink-3">
          {description}
        </p>
      )}
    </div>
  );
}
