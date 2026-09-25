import { Link } from "react-router-dom";
import { BrandMark } from "../components/layout/Brand";

const PHASES: Array<{ phase: string; title: string; body: string }> = [
  {
    phase: "Phase 2",
    title: "Trend & seasonality",
    body: "Long-run price behaviour, yearly averages, and the calendar-month pattern for each market.",
  },
  {
    phase: "Phase 3",
    title: "Stationarity",
    body: "Augmented Dickey–Fuller tests, the differencing order required, and ACF/PACF correlograms.",
  },
  {
    phase: "Phase 4–6",
    title: "Model comparison",
    body: "Multiple Regression against SARIMA on an identical chronological test window, scored by R² and RMSE.",
  },
  {
    phase: "Phase 7",
    title: "Forecast",
    body: "A twelve-month projection from whichever model actually scored better, with an approximate band.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[0.9375rem] font-semibold text-ink">
              Gold Price Analytics
            </span>
          </span>
          <nav className="flex items-center gap-1.5">
            <Link
              to="/login"
              className="rounded-[3px] px-3 py-2 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-[3px] border border-ink bg-ink px-3.5 py-2 text-[0.8125rem] font-medium text-canvas transition-colors hover:bg-black"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Hero */}
        <section className="grid gap-10 border-b border-line py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow">MCA mini project · Time-series modelling</p>
            <h1 className="mt-4 font-serif text-[2.25rem] leading-[1.14] font-semibold tracking-tight text-ink sm:text-[2.875rem]">
              Forty years of gold prices, examined with classical time-series methods.
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-2">
              A Python pipeline prepares the global and Indian gold series, tests them for
              stationarity, fits Multiple Regression and SARIMA, compares the two on the
              same test window, and projects twelve months ahead. This interface reads
              those results through the project's REST API — it does not recompute them.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="rounded-[3px] border border-ink bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-canvas transition-colors hover:bg-black"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="rounded-[3px] border border-line-2 bg-surface px-5 py-2.5 text-[0.8125rem] font-medium text-ink transition-colors hover:border-ink hover:bg-sunken"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Dataset readout */}
          <div className="lg:pt-2">
            <p className="eyebrow pb-3">Datasets</p>
            <dl className="border-t border-line">
              {[
                ["Global · World Gold Council", "1978–2018", "477 monthly observations, USD"],
                ["India · scraped daily series", "2011–2018", "95 monthly observations, INR"],
              ].map(([market, span, detail]) => (
                <div key={market} className="border-b border-line py-4">
                  <dt className="flex items-baseline justify-between gap-4">
                    <span className="text-[0.875rem] font-medium text-ink">{market}</span>
                    <span className="tnum shrink-0 font-mono text-[0.75rem] text-brass">
                      {span}
                    </span>
                  </dt>
                  <dd className="mt-1 text-[0.8125rem] text-ink-3">{detail}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-3">
              Historical academic analysis only. Not real-time prices, and not investment
              advice.
            </p>
          </div>
        </section>

        {/* What the pipeline produces */}
        <section className="py-14 sm:py-16">
          <p className="eyebrow">What you can explore</p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-2">
            {PHASES.map((item) => (
              <article key={item.title} className="bg-surface p-6">
                <p className="font-mono text-[0.6875rem] tracking-tight text-brass">
                  {item.phase}
                </p>
                <h2 className="mt-2 font-serif text-[1.0625rem] font-semibold text-ink">
                  {item.title}
                </h2>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <p className="text-[0.75rem] text-ink-3">
            Gold Price Analysis &amp; Prediction using Time Series Modeling · MCA mini
            project
          </p>
        </div>
      </footer>
    </div>
  );
}
