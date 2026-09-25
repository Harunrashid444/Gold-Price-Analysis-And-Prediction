import type { ReactNode } from "react";
import type { ApiState } from "../../hooks/useApi";
import { ErrorState, PageSkeleton } from "./states";

/**
 * Renders the three states of an API call in one place so no page repeats
 * loading / error / success branching.
 */
export function Async<T>({
  state,
  children,
  fallback,
}: {
  state: ApiState<T>;
  children: (data: T) => ReactNode;
  fallback?: ReactNode;
}) {
  if (state.loading) return <>{fallback ?? <PageSkeleton />}</>;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}
