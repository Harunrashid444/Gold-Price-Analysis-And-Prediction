import { data as api } from "../api/endpoints";
import type { ModelsResponse } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Stat, StatRow } from "../components/ui/Stat";
import { Badge, InfoHint, Panel, cx } from "../components/ui/primitives";
import { ActualVsPredictedChart } from "../components/charts/ActualVsPredictedChart";
import { DATASET_FULL_LABEL, formatMetric, formatPrice } from "../lib/format";

const HINTS = {
  r2: "Share of the test-period variation the model explains. 1.0 is perfect; 0 matches a flat average; below 0 is worse than that average.",
  rmse: "Root mean squared error — average size of the prediction error, in the same currency as the price. Lower is better.",
};

export function ModelsPage() {
  const { dataset } = useDataset();
  const state = useApi<ModelsResponse>((signal) => api.models(dataset, signal), [dataset]);

  return (
    <div className="space-y-9">
      <Async state={state}>
        {(result) => {
          const { dataset: meta, winner, regression, sarima, comparison } = result;
          const currency = meta.currency;

          const rmseGap =
            Math.abs(regression.rmse - sarima.rmse) / Math.max(regression.rmse, sarima.rmse);

          return (
            <>
              <header className="space-y-2">
                <p className="eyebrow">Phase 4–6 · Model comparison</p>
                <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
                  Regression against SARIMA — {DATASET_FULL_LABEL[dataset]}
                </h2>
                <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
                  Both models were evaluated on the same chronological test window and
                  scored with R² and RMSE. The selection below is what this project's
                  evaluation produced — it was not decided in advance.
                </p>
              </header>

              {/* Verdict */}
              <Panel className="border-l-2 border-l-brass">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow">Selected model</p>
                    <p className="mt-1.5 font-serif text-[1.375rem] font-semibold text-ink">
                      {winner}
                    </p>
                    <p className="mt-2 max-w-xl text-[0.8125rem] leading-relaxed text-ink-2">
                      Chosen because it recorded the lower test RMSE — by{" "}
                      {(rmseGap * 100).toFixed(0)}% on this market. This is the criterion
                      used throughout the project.
                    </p>
                  </div>
                  <Badge tone="brass">Lowest test RMSE</Badge>
                </div>
              </Panel>

              {/* Head-to-head */}
              <section className="space-y-4">
                <div className="border-b border-line pb-3">
                  <p className="eyebrow">Scores</p>
                  <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">
                    Head-to-head on the test set
                  </h3>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[32rem] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line-2">
                        <th scope="col" className="eyebrow pb-2.5">
                          Model
                        </th>
                        <th scope="col" className="eyebrow pb-2.5 text-right">
                          R²
                          <InfoHint text={HINTS.r2} />
                        </th>
                        <th scope="col" className="eyebrow pb-2.5 text-right">
                          RMSE
                          <InfoHint text={HINTS.rmse} />
                        </th>
                        <th scope="col" className="eyebrow pb-2.5 text-right" />
                      </tr>
                    </thead>
                    <tbody className="tnum">
                      {comparison.map((row) => {
                        const isWinner = row.model === winner;
                        return (
                          <tr key={row.model} className="border-b border-line last:border-b-0">
                            <td
                              className={cx(
                                "py-3 text-[0.8125rem]",
                                isWinner ? "font-medium text-ink" : "text-ink-2",
                              )}
                            >
                              {row.model}
                            </td>
                            <td
                              className={cx(
                                "py-3 text-right text-[0.8125rem]",
                                row.r2 < 0 ? "text-neg" : "text-ink",
                              )}
                            >
                              {formatMetric(row.r2)}
                            </td>
                            <td className="py-3 text-right text-[0.8125rem] text-ink">
                              {formatMetric(row.rmse, 2)}
                            </td>
                            <td className="py-3 pl-3 text-right">
                              {isWinner && <Badge tone="brass">Selected</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {comparison.some((row) => row.r2 < 0) && (
                  <p className="text-[0.75rem] leading-relaxed text-ink-3">
                    A negative R² means the model tracked the test window less accurately
                    than simply predicting the average of that window would have.
                  </p>
                )}
              </section>

              {/* Regression */}
              <ModelBlock
                eyebrow="Phase 4"
                name={regression.name}
                isWinner={winner === regression.name}
                explanation={regression.explanation}
                r2={regression.r2}
                rmse={regression.rmse}
                currency={currency}
                meta={
                  <>
                    <span className="eyebrow">Features</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {regression.features.map((feature) => (
                        <code
                          key={feature}
                          className="rounded-[2px] border border-line bg-sunken px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-2"
                        >
                          {feature}
                        </code>
                      ))}
                    </div>
                  </>
                }
              />

              <ActualVsPredictedChart
                data={regression.actualVsPredicted}
                title={`${regression.name} — actual vs predicted`}
                subtitle={`${regression.actualVsPredicted.length} test months`}
                currency={currency}
                footnote="Each month is predicted from the real prices of the months before it, so the line re-anchors to reality every step."
              />

              {/* SARIMA */}
              <ModelBlock
                eyebrow="Phase 5"
                name={sarima.name}
                isWinner={winner === sarima.name}
                explanation={sarima.explanation}
                r2={sarima.r2}
                rmse={sarima.rmse}
                currency={currency}
                meta={
                  <>
                    <span className="eyebrow">Orders</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <code className="rounded-[2px] border border-line bg-sunken px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-2">
                        order ({sarima.order.join(", ")})
                      </code>
                      <code className="rounded-[2px] border border-line bg-sunken px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-2">
                        seasonal ({sarima.seasonalOrder.join(", ")})
                      </code>
                    </div>
                  </>
                }
              />

              <ActualVsPredictedChart
                data={sarima.actualVsPredicted}
                title={`${sarima.name} — actual vs predicted`}
                subtitle={`${sarima.actualVsPredicted.length} test months`}
                currency={currency}
                footnote="SARIMA produces one multi-step forecast across the whole test window without seeing any actual prices inside it, which is why it can drift over a long horizon."
              />

              <p className="rule pt-5 text-[0.75rem] leading-relaxed text-ink-3">
                The two models are scored over the same test dates but are not evaluated
                identically: regression predicts each month from that month's real recent
                prices, while SARIMA forecasts the entire window in one step. That
                difference follows from how each model works and is worth keeping in mind
                when reading the table.
              </p>
            </>
          );
        }}
      </Async>
    </div>
  );
}

/* ------------------------------ model block ------------------------------ */

function ModelBlock({
  eyebrow,
  name,
  isWinner,
  explanation,
  r2,
  rmse,
  currency,
  meta,
}: {
  eyebrow: string;
  name: string;
  isWinner: boolean;
  explanation: string;
  r2: number;
  rmse: number;
  currency: string;
  meta: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div className="max-w-2xl">
          <p className="eyebrow">{eyebrow}</p>
          <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">{name}</h3>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">{explanation}</p>
        </div>
        {isWinner && <Badge tone="brass">Selected</Badge>}
      </div>

      <StatRow columns={3}>
        <Stat
          label="R²"
          value={formatMetric(r2)}
          tone={r2 < 0 ? "negative" : "default"}
          hint={HINTS.r2}
          detail={r2 < 0 ? "Worse than a flat average" : "Closer to 1 is better"}
        />
        <Stat
          label="RMSE"
          value={formatMetric(rmse, 2)}
          hint={HINTS.rmse}
          detail={`Average error, ${currency}`}
        />
        <Stat label="Typical miss" value={formatPrice(rmse, currency)} detail="Same figure, priced" />
      </StatRow>

      <div>{meta}</div>
    </section>
  );
}
