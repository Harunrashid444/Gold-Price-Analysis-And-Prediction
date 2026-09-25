import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BrandMark } from "./Brand";

/**
 * Gate for every analysis screen. While the stored token is being validated we
 * hold on a neutral splash rather than flashing the login page at a user who
 * is in fact signed in.
 */
export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <BootSplash />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas" role="status">
      <div className="flex flex-col items-center gap-3">
        <BrandMark className="animate-pulse" />
        <p className="text-[0.8125rem] text-ink-3">Restoring session…</p>
      </div>
    </div>
  );
}

/** Inverse guard: keeps signed-in users off the login/register screens. */
export function PublicOnlyRoute() {
  const { user, initializing } = useAuth();

  if (initializing) return <BootSplash />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
