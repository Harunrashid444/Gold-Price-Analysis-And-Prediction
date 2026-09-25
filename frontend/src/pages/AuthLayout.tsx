import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/layout/Brand";

const FACTS: Array<[string, string]> = [
  ["Global series", "1978–2018 · 477 months · USD"],
  ["Indian series", "2011–2018 · 95 months · INR"],
  ["Methods", "Multiple Regression · SARIMA"],
  ["Horizon", "12-month forecast"],
];

/**
 * Two-column shell for sign-in and registration: an editorial ink panel that
 * states what the project is, beside the form itself.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Editorial panel */}
      <aside className="relative hidden flex-col justify-between bg-ink px-10 py-12 lg:flex xl:px-14">
        <Link to="/" className="flex items-center gap-3 rounded-[3px]">
          <BrandMark />
          <span className="leading-tight">
            <span className="block font-serif text-[0.9375rem] font-semibold text-canvas">
              Gold Price Analytics
            </span>
            <span className="block text-[0.625rem] font-medium tracking-[0.09em] text-canvas/45 uppercase">
              Time-series research
            </span>
          </span>
        </Link>

        <div className="max-w-md">
          <p className="text-[0.6875rem] font-semibold tracking-[0.11em] text-brass-2 uppercase">
            MCA mini project
          </p>
          <h2 className="mt-4 font-serif text-[2rem] leading-[1.18] font-semibold text-canvas">
            Forty years of gold prices, examined with classical time-series methods.
          </h2>
          <p className="mt-4 text-[0.875rem] leading-relaxed text-canvas/60">
            Trend and seasonality analysis, stationarity testing, and a comparison of
            Multiple Regression against SARIMA — computed in Python, served through the
            project API, and read here.
          </p>
        </div>

        <dl className="space-y-0 border-t border-canvas/12">
          {FACTS.map(([term, value]) => (
            <div
              key={term}
              className="flex items-baseline justify-between gap-6 border-b border-canvas/12 py-2.5"
            >
              <dt className="text-[0.75rem] text-canvas/45">{term}</dt>
              <dd className="tnum font-mono text-[0.75rem] text-canvas/80">{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="font-serif text-[0.9375rem] font-semibold text-ink">
              Gold Price Analytics
            </span>
          </Link>

          <h1 className="font-serif text-[1.625rem] leading-tight font-semibold text-ink">
            {title}
          </h1>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 border-t border-line pt-5 text-[0.8125rem] text-ink-2">
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
