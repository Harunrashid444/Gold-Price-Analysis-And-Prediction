import { data as api } from "../api/endpoints";
import type { AdfResult, StationarityResponse } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Stat, StatRow } from "../components/ui/Stat";
import { Badge, cx } from "../components/ui/primitives";
import { CorrelogramChart } from "../components/charts/CorrelogramChart";
import { DATASET_COLOR, DATASET_FULL_LABEL, formatMetric, formatPValue } from "../lib/format";

const HINTS = {
  adf: "The Augmented Dickey–Fuller statistic. The more negative it is relative to the critical values, the stronger the evidence against a unit root.",
  pValue:
    "Probability of seeing this result if the series really were non-stationary. Below 0.05 the series is treated as stationary.",
  d: "How many times the series had to be differenced (each value replaced by its change from the previous month) before the test reported stationarity.",
  series:
    "Whether the raw price or its logarithm was analysed. The log is used only when it reduces the differencing needed.",
};

export function StationarityPage() {
  const { dataset } = useDataset();
  const state = useApi<StationarityResponse>(
    (signal) => api.stationarity(dataset, signal),
    [dataset],
  );
  const color = DATASET_COLOR[dataset];

  return (
    <div className="space-y-9">
      <Async state={state}>
        {(result) => {
          const { dataset: meta, rawHistory, logHistory, acf, pacf } = result;
          const final = rawHistory[rawHistory.length - 1];

          return (
            <>
              <header className="space-y-2">
                <p className="eyebrow">Phase 3 · Stationarity</p>
                <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
                  Stationarity testing — {DATASET_FULL_LABEL[dataset]}
                </h2>
                <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
                  {result.explanation} Time-series models such as SARIMA assume it, so the
                  series is differenced until the test agrees.
                </p>
              </header>

              <StatRow columns={4}>
                <Stat
                  label="Verdict"
                  value={final?.isStationary ? "Stationary" : "Non-stationary"}
                  tone={final?.isStationary ? "positive" : "negative"}
                  detail={
                    result.differencingOrder === 0
                      ? "Without any differencing"
                      : `After ${result.differencingOrder} difference${result.differencingOrder === 1 ? "" : "s"}`
                  }
                />
                <Stat
                  label="Differencing order (d)"
                  value={result.differencingOrder}
                  hint={HINTS.d}
                  detail={result.differencingOrder === 0 ? "Stationary as-is" : "Applied before modelling"}
                />
                <Stat
                  label="Series analysed"
                  value={result.seriesUsed === "log_price" ? "Log price" : "Original price"}
                  hint={HINTS.series}
                  detail={result.logNeeded ? "Log transform helped" : "Log transform not needed"}
                />
                <Stat
                  label="Final p-value"
                  value={final ? formatPValue(final.pValue) : "—"}
                  hint={HINTS.pValue}
                  detail="Threshold 0.05"
                />
              </StatRow>

              <AdfTable
                title="ADF results on the raw price"
                subtitle="One row per differencing step attempted"
                rows={rawHistory}
              />

              {logHistory && logHistory.length > 0 && (
                <AdfTable
                  title="ADF results on the log price"
                  subtitle={
                    result.logNeeded
                      ? "The log transform reduced the differencing required, so it was adopted"
                      : "Checked for comparison — it did not reduce the differencing required, so the original price was kept"
                  }
                  rows={logHistory}
                />
              )}

              <section className="space-y-5">
                <div className="border-b border-line pb-3">
                  <p className="eyebrow">Correlograms</p>
                  <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">
                    ACF and PACF of the stationary series
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-ink-2">
                    These two plots are what the project used to choose candidate SARIMA
                    orders. The ACF suggests the moving-average term, the PACF the
                    autoregressive term.
                  </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <CorrelogramChart
                    data={acf}
                    title="Autocorrelation (ACF)"
                    subtitle="Correlation of the series with its own past values"
                    sampleSize={meta.observations}
                    color={color}
                  />
                  <CorrelogramChart
                    data={pacf}
                    title="Partial autocorrelation (PACF)"
                    subtitle="Correlation at each lag once shorter lags are accounted for"
                    sampleSize={meta.observations}
                    color={color}
                  />
                </div>
              </section>
            </>
          );
        }}
      </Async>
    </div>
  );
}

/* ------------------------------ ADF table ------------------------------ */

function AdfTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: AdfResult[];
}) {
  const criticalKeys = Object.keys(rows[0]?.criticalValues ?? {});

  return (
    <section className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="text-[0.9375rem] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-2">{subtitle}</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-2">
              <th scope="col" className="eyebrow pb-2.5">
                Step
              </th>
              <th scope="col" className="eyebrow pb-2.5 text-right">
                ADF statistic
              </th>
              <th scope="col" className="eyebrow pb-2.5 text-right">
                p-value
              </th>
              {criticalKeys.map((key) => (
                <th key={key} scope="col" className="eyebrow pb-2.5 text-right">
                  Crit. {key}
                </th>
              ))}
              <th scope="col" className="eyebrow pb-2.5 text-right">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-b-0">
                <td className="py-3 text-[0.8125rem] text-ink">
                  <span className="font-medium">d = {row.d}</span>
                  <span className="ml-2 text-ink-3">
                    {row.d === 0 ? "no differencing" : `${row.d}× differenced`}
                  </span>
                </td>
                <td className="py-3 text-right text-[0.8125rem] text-ink">
                  {formatMetric(row.adfStatistic)}
                </td>
                <td
                  className={cx(
                    "py-3 text-right text-[0.8125rem]",
                    row.isStationary ? "font-medium text-pos" : "text-ink",
                  )}
                >
                  {formatPValue(row.pValue)}
                </td>
                {criticalKeys.map((key) => (
                  <td key={key} className="py-3 text-right text-[0.8125rem] text-ink-3">
                    {formatMetric(row.criticalValues[key], 3)}
                  </td>
                ))}
                <td className="py-3 pl-3 text-right">
                  <Badge tone={row.isStationary ? "positive" : "neutral"}>
                    {row.isStationary ? "Stationary" : "Non-stationary"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
