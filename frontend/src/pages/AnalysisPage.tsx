import { data as api } from "../api/endpoints";
import type { AnalysisResponse } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Stat, StatRow } from "../components/ui/Stat";
import { PriceChart } from "../components/charts/PriceChart";
import { MonthlySeasonalityChart, YearlyChart } from "../components/charts/BarCharts";
import {
  DATASET_COLOR,
  DATASET_FULL_LABEL,
  formatLongDate,
  formatPercent,
  formatPrice,
} from "../lib/format";

/** Global uses a 12-month trend window, India a 6-month one — matching
 *  export_web_results.py, which is what populated `movingAverage`. */
const MA_WINDOW = { global: 12, india: 6 } as const;

export function AnalysisPage() {
  const { dataset } = useDataset();
  const state = useApi<AnalysisResponse>((signal) => api.analysis(dataset, signal), [dataset]);
  const color = DATASET_COLOR[dataset];

  return (
    <div className="space-y-9">
      <Async state={state}>
        {({ dataset: meta, historical, yearly, monthly }) => {
          const first = historical[0];
          const last = historical[historical.length - 1];
          const totalChange = ((last.price - first.price) / first.price) * 100;

          const peak = yearly.reduce((a, b) => (b.averagePrice > a.averagePrice ? b : a));
          const trough = yearly.reduce((a, b) => (b.averagePrice < a.averagePrice ? b : a));

          return (
            <>
              <header className="space-y-2">
                <p className="eyebrow">Phase 2 · Exploratory analysis</p>
                <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
                  {DATASET_FULL_LABEL[dataset]}
                </h2>
                <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
                  {meta.source} · {meta.observations} monthly observations from{" "}
                  {formatLongDate(meta.startDate)} to {formatLongDate(meta.endDate)}.
                </p>
              </header>

              <StatRow columns={4}>
                <Stat
                  label="Latest price"
                  value={formatPrice(meta.latestPrice, meta.currency)}
                  detail={formatLongDate(meta.latestDate)}
                />
                <Stat
                  label="Change over record"
                  value={formatPercent(totalChange)}
                  tone={totalChange >= 0 ? "positive" : "negative"}
                  detail={`From ${formatPrice(first.price, meta.currency)} in ${first.date.slice(0, 4)}`}
                  hint="Difference between the first and last observed monthly price. It is not an annualised return."
                />
                <Stat
                  label="Highest year"
                  value={String(peak.year)}
                  detail={`Average ${formatPrice(peak.averagePrice, meta.currency)}`}
                />
                <Stat
                  label="Lowest year"
                  value={String(trough.year)}
                  detail={`Average ${formatPrice(trough.averagePrice, meta.currency)}`}
                />
              </StatRow>

              <PriceChart
                data={historical}
                color={color}
                currency={meta.currency}
                maWindow={MA_WINDOW[dataset]}
                title="Historical monthly price"
                subtitle={`Every observation in the series, with the ${MA_WINDOW[dataset]}-month moving average used as the trend line`}
                height={360}
              />

              <div className="grid gap-5 xl:grid-cols-2">
                <YearlyChart data={yearly} color={color} currency={meta.currency} />
                <MonthlySeasonalityChart
                  data={monthly}
                  color={color}
                  currency={meta.currency}
                  highlightWedding={false}
                  subtitle="Averaged across every year in the record"
                />
              </div>

              <p className="rule pt-5 text-[0.75rem] leading-relaxed text-ink-3">
                The moving-average line begins only once its window fills — the first{" "}
                {MA_WINDOW[dataset]} months therefore carry no trend value. Monthly averages
                pool all years together, so they describe a calendar pattern rather than any
                single year.
              </p>
            </>
          );
        }}
      </Async>
    </div>
  );
}
