import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cx } from "../ui/primitives";
import { NAV_ITEMS, navItemFor } from "./nav";
import { DatasetSwitcher } from "./DatasetSwitcher";
import { Wordmark } from "./Brand";

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItemFor(location.pathname);

  return (
    <div className="min-h-screen bg-canvas">
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Fixed sidebar on desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/92 backdrop-blur-[2px]">
          <div className="flex h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="-ml-1 rounded-[3px] p-2 text-ink-2 transition-colors hover:bg-sunken hover:text-ink lg:hidden"
            >
              <MenuIcon />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-[1rem] font-semibold text-ink">
                {current?.label ?? "Overview"}
              </h1>
            </div>

            {current?.usesDataset && <DatasetSwitcher />}
          </div>
        </header>

        <main className="mx-auto max-w-[76rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[76rem] px-4 pb-10 sm:px-6 lg:px-8">
          <p className="rule pt-5 text-[0.6875rem] leading-relaxed text-ink-3">
            Historical academic analysis only — not real-time prices and not investment
            advice. Figures are produced by the project's Python pipeline (Phases 1–7) and
            served unchanged by the API.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------- sidebar body ---------------------------- */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="flex h-14 items-center border-b border-line px-5">
        <Wordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="eyebrow px-2 pb-2">Sections</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    "group relative flex items-center justify-between gap-2 rounded-[3px] py-2 pr-2.5 pl-3",
                    "text-[0.8125rem] transition-colors duration-150",
                    isActive
                      ? "bg-sunken font-medium text-ink"
                      : "text-ink-2 hover:bg-sunken/60 hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full bg-brass"
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                    <span
                      className={cx(
                        "shrink-0 font-mono text-[0.625rem] tracking-tight",
                        isActive ? "text-brass" : "text-ink-3/70",
                      )}
                    >
                      {item.phase}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="px-2 py-1.5">
          <p className="truncate text-[0.8125rem] font-medium text-ink">{user?.name}</p>
          <p className="truncate text-[0.75rem] text-ink-3">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className={cx(
            "mt-1 flex w-full items-center gap-2 rounded-[3px] px-2 py-2",
            "text-[0.8125rem] text-ink-2 transition-colors hover:bg-sunken hover:text-ink",
          )}
        >
          <SignOutIcon />
          Sign out
        </button>
      </div>
    </>
  );
}

/* ---------------------------- mobile drawer ---------------------------- */

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25"
      />
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface">
        {/* Navigating from inside the drawer closes it. */}
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}

/* -------------------------------- icons -------------------------------- */

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" />
      <path d="M13 14l4-4-4-4M17 10H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
