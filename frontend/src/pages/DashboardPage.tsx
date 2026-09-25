import { Link } from "react-router-dom";
import { data as api } from "../api/endpoints";
import type { DatasetKey, DatasetMeta, GoldSeriesResponse, OverviewResponse } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Panel, cx } from "../components/ui/primitives";
import { Sparkline } from "../components/charts/Sparkline";
import {
  DATASET_COLOR,
  DATASET_FULL_LABEL,
  formatLongDate,
  formatMetric,
  formatPrice,
} from "../lib/format";
import { NAV_ITEMS } from "../components/layout/nav";

export function DashboardPage() {
  const { user } = useAuth();
  const overview = useApi<OverviewResponse>((signal) => api.overview(signal), []);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Overview</p>
        <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
          Welcome back, {firstName}.
        </h2>
        <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
          Both gold series prepared by the pipeline, with the model that scored best on
          each. Open a section for the full analysis.
        </p>
      </header>

      <Async state={overview}>
        {(data) => (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <MarketCard dataset="global" meta={data.datasets.global} winner={data.winners.global} />
              <MarketCard dataset="india" meta={data.datasets.india} winner={data.winners.india} />
            </div>

            <MetricsTable overview={data} />

            <SectionIndex />
          </>
        )}
      </Async>
    </div>
  );
}

/* ---------------------------- market summary ---------------------------- */

function MarketCard({
  dataset,
  meta,
  winner,
}: {
  dataset: DatasetKey;
  meta: DatasetMeta;
  winner: string;
}) {
  const { setDataset } = useDataset();
  const series = useApi<GoldSeriesResponse>((signal) => api.gold(dataset, signal), [dataset]);
  const color = DATASET_COLOR[dataset];

  return (
    <Panel padded={false} className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-serif text-[1.0625rem] font-semibold text-ink">
              {DATASET_FULL_LABEL[dataset]}
            </h3>
          </div>
          <p className="mt-1 truncate text-[0.75rem] text-ink-3">{meta.source}</p>
        </div>
        <span className="tnum shrink-0 font-mono text-[0.6875rem] text-ink-3">
          {meta.currency}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Latest observed</p>
            <p className="tnum mt-1.5 font-serif text-[1.75rem] leading-none font-semibold text-ink">
              {formatPrice(meta.latestPrice, meta.currency)}
            </p>
            <p className="mt-1.5 text-[0.75rem] text-ink-3">
              {formatLongDate(meta.latestDate)}
            </p>
          </div>
          <div className="w-32 sm:w-40">
            {series.loading ? (
              <div className="h-11 animate-pulse rounded-[2px] bg-sunken" />
            ) : series.data ? (
              <Sparkline data={series.data.series} color={color} />
            ) : null}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <div className="bg-surface px-5 py-3">
          <dt className="eyebrow">Coverage</dt>
          <dd className="tnum mt-1 text-[0.8125rem] font-medium text-ink">
            {meta.startDate.slice(0, 4)}–{meta.endDate.slice(0, 4)}
          </dd>
          <dd className="mt-0.5 text-[0.75rem] text-ink-3">
            {meta.observations} months · {meta.frequency.toLowerCase()}
          </dd>
        </div>
        <div className="bg-surface px-5 py-3">
          <dt className="eyebrow">Best model</dt>
          <dd className="mt-1 text-[0.8125rem] font-medium text-ink">{winner}</dd>
          <dd className="mt-0.5 text-[0.75rem] text-ink-3">by test RMSE</dd>
        </div>
      </dl>

      <div className="border-t border-line px-5 py-3">
        <Link
          to="/analysis"
          onClick={() => setDataset(dataset)}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brass transition-colors hover:text-ink"
        >
          Open analysis
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Panel>
  );
}

/* ---------------------------- metrics table ---------------------------- */

function MetricsTable({ overview }: { overview: OverviewResponse }) {
  const rows = (["global", "india"] as DatasetKey[]).flatMap((key) =>
    overview.metrics[key].map((row) => ({ key, ...row })),
  );

  return (
    <section className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="eyebrow">Model results</p>
        <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">
          Test-set scores for every model fitted
        </h3>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-2">
              {["Market", "Model", "R²", "RMSE", ""].map((head, i) => (
                <th
                  key={head || i}
                  scope="col"
                  className={cx(
                    "eyebrow pb-2.5",
                    (head === "R²" || head === "RMSE") && "text-right",
                  )}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.map((row) => {
              const isWinner = overview.winners[row.key] === row.model;
              return (
                <tr
                  key={`${row.key}-${row.model}`}
                  className="border-b border-line last:border-b-0"
                >
                  <td className="py-3 text-[0.8125rem] text-ink-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: DATASET_COLOR[row.key] }}
                      />
                      {row.key === "global" ? "Global" : "India"}
                    </span>
                  </td>
                  <td className="py-3 text-[0.8125rem] font-medium text-ink">{row.model}</td>
                  <td className="py-3 text-right text-[0.8125rem] text-ink">
                    {formatMetric(row.r2)}
                  </td>
                  <td className="py-3 text-right text-[0.8125rem] text-ink">
                    {formatMetric(row.rmse, 2)}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {isWinner && (
                      <span className="inline-flex items-center rounded-[2px] border border-brass/30 bg-brass-wash px-1.5 py-0.5 text-[0.6875rem] font-medium text-brass">
                        Selected
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-3">
        “Selected” marks the model with the lower test RMSE for that market — the
        criterion this project's Phase 6 comparison uses. A negative R² means the model
        tracked the test period worse than a flat average would have.
      </p>
    </section>
  );
}

/* ---------------------------- section index ---------------------------- */

function SectionIndex() {
  const items = NAV_ITEMS.filter((item) => item.usesDataset);

  return (
    <section className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="eyebrow">Sections</p>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.to} className="bg-surface">
            <Link
              to={item.to}
              className="group block p-5 transition-colors hover:bg-sunken/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.875rem] font-medium text-ink">{item.label}</span>
                <span className="shrink-0 font-mono text-[0.625rem] text-brass">
                  {item.phase}
                </span>
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-3">
                {item.description}
              </p>
            </Link>
          </li>
        ))}
        {/* The grid's hairlines are the bg showing through 1px gaps, so an odd
            item count would leave a bare grey cell in the last slot. */}
        {items.length % 2 === 1 && (
          <li aria-hidden="true" className="hidden bg-surface sm:block" />
        )}
      </ul>
    </section>
  );
}
