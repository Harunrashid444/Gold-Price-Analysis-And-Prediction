import { data as api } from "../api/endpoints";
import type { ForecastResponse } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Stat, StatRow } from "../components/ui/Stat";
import { Panel } from "../components/ui/primitives";
import { ForecastChart } from "../components/charts/ForecastChart";
import {
  DATASET_COLOR,
  DATASET_FULL_LABEL,
  formatLongDate,
  formatMonth,
  formatPercent,
  formatPrice,
} from "../lib/format";

export function ForecastPage() {
  const { dataset } = useDataset();
  const state = useApi<ForecastResponse>((signal) => api.forecast(dataset, signal), [dataset]);
  const color = DATASET_COLOR[dataset];

  return (
    <div className="space-y-9">
      <Async state={state}>
        {(result) => {
          const { dataset: meta, historical, points, model, horizonMonths } = result;
          const currency = meta.currency;

          const lastObserved = historical[historical.length - 1];
          const finalPoint = points[points.length - 1];
          const changePct =
            ((finalPoint.predictedPrice - lastObserved.price) / lastObserved.price) * 100;
          const bandWidth = finalPoint.upperBound - finalPoint.lowerBound;

          return (
            <>
              <header className="space-y-2">
                <p className="eyebrow">Phase 7 · Forecast</p>
                <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
                  {horizonMonths}-month projection — {DATASET_FULL_LABEL[dataset]}
                </h2>
                <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
                  Produced by {model}, refitted on the full history and extended forward
                  one month at a time. These are model estimates, not guaranteed prices.
                </p>
              </header>

              <StatRow columns={4}>
                <Stat
                  label="Last observed"
                  value={formatPrice(lastObserved.price, currency)}
                  detail={formatLongDate(lastObserved.date)}
                />
                <Stat
                  label={`Projected · month ${horizonMonths}`}
                  value={formatPrice(finalPoint.predictedPrice, currency)}
                  tone="brass"
                  detail={formatMonth(finalPoint.date)}
                />
                <Stat
                  label="Implied change"
                  value={formatPercent(changePct)}
                  tone={changePct >= 0 ? "positive" : "negative"}
                  detail="Across the full horizon"
                  hint="Difference between the last observed price and the final projected month. It is a model output, not a target."
                />
                <Stat
                  label="Band width"
                  value={`± ${formatPrice(bandWidth / 2, currency)}`}
                  detail="At the final month"
                  hint="Half the distance between the upper and lower bound — an approximate margin, not a rigorous prediction interval."
                />
              </StatRow>

              <ForecastChart
                historical={historical}
                points={points}
                color={color}
                currency={currency}
                historyMonths={Math.min(48, historical.length)}
                footnote={result.boundNote}
              />

              <ForecastTable result={result} />

              <Panel className="border-l-2 border-l-brass">
                <p className="eyebrow">How to read this</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
                  {result.forecastModelNote}
                </p>
                <p className="mt-3 border-t border-line pt-3 text-[0.8125rem] leading-relaxed text-ink-3">
                  {result.disclaimer}
                </p>
              </Panel>
            </>
          );
        }}
      </Async>
    </div>
  );
}

/* ---------------------------- forecast table ---------------------------- */

function ForecastTable({ result }: { result: ForecastResponse }) {
  const currency = result.dataset.currency;

  return (
    <section className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="eyebrow">Monthly detail</p>
        <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">
          Projected values by month
        </h3>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-2">
              <th scope="col" className="eyebrow pb-2.5">
                Month
              </th>
              <th scope="col" className="eyebrow pb-2.5 text-right">
                Lower bound
              </th>
              <th scope="col" className="eyebrow pb-2.5 text-right">
                Predicted
              </th>
              <th scope="col" className="eyebrow pb-2.5 text-right">
                Upper bound
              </th>
            </tr>
          </thead>
          <tbody className="tnum">
            {result.points.map((point, index) => (
              <tr key={point.date} className="border-b border-line last:border-b-0">
                <td className="py-2.5 text-[0.8125rem] text-ink">
                  <span className="mr-2 font-mono text-[0.6875rem] text-ink-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {formatMonth(point.date)}
                </td>
                <td className="py-2.5 text-right text-[0.8125rem] text-ink-3">
                  {formatPrice(point.lowerBound, currency)}
                </td>
                <td className="py-2.5 text-right text-[0.8125rem] font-medium text-ink">
                  {formatPrice(point.predictedPrice, currency)}
                </td>
                <td className="py-2.5 text-right text-[0.8125rem] text-ink-3">
                  {formatPrice(point.upperBound, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-3">{result.boundNote}</p>
    </section>
  );
}
