import { data as api } from "../api/endpoints";
import type { SeasonalityResponse, WeddingSeason } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useDataset } from "../context/DatasetContext";
import { Async } from "../components/ui/Async";
import { Stat, StatRow } from "../components/ui/Stat";
import { EmptyState } from "../components/ui/states";
import { Badge, Panel } from "../components/ui/primitives";
import { MonthlySeasonalityChart } from "../components/charts/BarCharts";
import {
  DATASET_COLOR,
  DATASET_FULL_LABEL,
  formatPercent,
  formatPrice,
  monthName,
} from "../lib/format";

export function SeasonalityPage() {
  const { dataset } = useDataset();
  const state = useApi<SeasonalityResponse>(
    (signal) => api.seasonality(dataset, signal),
    [dataset],
  );
  const color = DATASET_COLOR[dataset];

  return (
    <div className="space-y-9">
      <Async state={state}>
        {({ dataset: meta, monthly, weddingSeason }) => {
          const peak = monthly.reduce((a, b) => (b.averagePrice > a.averagePrice ? b : a));
          const low = monthly.reduce((a, b) => (b.averagePrice < a.averagePrice ? b : a));
          const spread = ((peak.averagePrice - low.averagePrice) / low.averagePrice) * 100;

          return (
            <>
              <header className="space-y-2">
                <p className="eyebrow">Phase 2 · Seasonality</p>
                <h2 className="font-serif text-[1.75rem] leading-tight font-semibold text-ink">
                  Calendar patterns — {DATASET_FULL_LABEL[dataset]}
                </h2>
                <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-2">
                  Average price for each calendar month, pooled across every year in the
                  record. This describes a repeating pattern, not a prediction.
                </p>
              </header>

              <StatRow columns={3}>
                <Stat
                  label="Strongest month"
                  value={peak.monthName}
                  detail={`Average ${formatPrice(peak.averagePrice, meta.currency)}`}
                />
                <Stat
                  label="Weakest month"
                  value={low.monthName}
                  detail={`Average ${formatPrice(low.averagePrice, meta.currency)}`}
                />
                <Stat
                  label="Spread"
                  value={`${spread.toFixed(1)}%`}
                  detail="Strongest month above the weakest"
                  hint="How far apart the highest and lowest calendar-month averages are. A small spread means little month-to-month seasonality."
                />
              </StatRow>

              <MonthlySeasonalityChart
                data={monthly}
                color={color}
                currency={meta.currency}
                highlightWedding={weddingSeason !== null}
                title="Average price by calendar month"
                subtitle={
                  weddingSeason
                    ? "Wedding-season months are highlighted"
                    : "Averaged across every year in the record"
                }
                height={320}
              />

              {weddingSeason ? (
                <WeddingSeasonAnalysis wedding={weddingSeason} currency={meta.currency} />
              ) : (
                <section className="space-y-4">
                  <div className="border-b border-line pb-3">
                    <p className="eyebrow">Wedding-season check</p>
                  </div>
                  <EmptyState
                    title="Not applicable to the global series"
                    description="The wedding-season comparison is defined only for the Indian market, where the synopsis raises it. Switch the market selector to India to see it."
                  />
                </section>
              )}
            </>
          );
        }}
      </Async>
    </div>
  );
}

/* ------------------------- wedding-season block ------------------------- */

function WeddingSeasonAnalysis({
  wedding,
  currency,
}: {
  wedding: WeddingSeason;
  currency: string;
}) {
  const diff = wedding.difference_pct;

  // Phase 2 treats a gap under 3% as weak evidence — mirror that threshold so
  // the badge never overstates what the pipeline concluded.
  const isMaterial = Math.abs(diff) >= 3;

  const strength = isMaterial
    ? wedding.wedding_months_in_top_3.length >= 2
      ? { label: "Pattern present", tone: "brass" as const }
      : { label: "Mixed evidence", tone: "neutral" as const }
    : { label: "Weak / inconclusive", tone: "neutral" as const };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="eyebrow">Wedding-season check · India</p>
          <h3 className="mt-1.5 font-serif text-[1.25rem] font-semibold text-ink">
            Do wedding-season months carry higher prices?
          </h3>
        </div>
        <Badge tone={strength.tone}>{strength.label}</Badge>
      </div>

      <StatRow columns={4}>
        <Stat
          label="Wedding months"
          value={formatPrice(wedding.wedding_season_avg, currency)}
          detail={wedding.weddingSeasonMonths.map(monthName).join(" · ")}
        />
        <Stat
          label="Other months"
          value={formatPrice(wedding.other_months_avg, currency)}
          detail="The remaining seven months"
        />
        <Stat
          label="Difference"
          value={formatPercent(diff)}
          tone={isMaterial ? (diff > 0 ? "positive" : "negative") : "default"}
          detail={isMaterial ? "A noticeable gap" : "Too small to be meaningful"}
          hint="Wedding-season average measured against the average of all other months."
        />
        <Stat
          label="In the top 3 months"
          value={`${wedding.wedding_months_in_top_3.length} of 3`}
          detail={
            wedding.top_3_months_overall.length > 0
              ? `Highest overall: ${wedding.top_3_months_overall.map(monthName).join(", ")}`
              : undefined
          }
          hint="How many of the three highest-averaging months are wedding-season months."
        />
      </StatRow>

      <Panel className="border-l-2 border-l-brass">
        <p className="eyebrow">Conclusion from the pipeline</p>
        <p className="mt-2 font-serif text-[1.0625rem] leading-snug text-ink">
          {wedding.conclusion}
        </p>
        <p className="mt-3 border-t border-line pt-3 text-[0.8125rem] leading-relaxed text-ink-3">
          {wedding.caveat}
        </p>
      </Panel>
    </section>
  );
}
