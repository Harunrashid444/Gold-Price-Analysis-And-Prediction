import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyPoint, YearlyPoint } from "../../api/types";
import { formatAxisPrice, formatPrice } from "../../lib/format";
import { AXIS, ChartFrame, GRID, LegendKey, TooltipCard } from "./ChartKit";

/** Average price per calendar year. */
export function YearlyChart({
  data,
  color,
  currency,
  height = 300,
}: {
  data: YearlyPoint[];
  color: string;
  currency: string;
  height?: number;
}) {
  return (
    <ChartFrame
      title="Average price by year"
      subtitle="Mean of the monthly closes within each calendar year"
      height={height}
    >
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="year" minTickGap={20} {...AXIS} />
        <YAxis tickFormatter={formatAxisPrice} width={52} axisLine={false} {...AXIS} />
        <Tooltip
          cursor={{ fill: "#f4f2ed" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as YearlyPoint;
            return (
              <TooltipCard
                title={String(point.year)}
                rows={[
                  { label: "Average", value: formatPrice(point.averagePrice, currency), color },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="averagePrice" fill={color} isAnimationActive={false} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  );
}

/**
 * Average price by calendar month across all years.
 * Wedding-season months are flagged by the pipeline itself
 * (`isWeddingSeasonMonth`) — we only colour what the API already decided.
 */
export function MonthlySeasonalityChart({
  data,
  color,
  currency,
  highlightWedding,
  height = 300,
  title = "Average price by calendar month",
  subtitle,
}: {
  data: MonthlyPoint[];
  color: string;
  currency: string;
  highlightWedding: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}) {
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      legend={
        highlightWedding ? (
          <>
            <LegendKey color="#b08d3e" label="Wedding-season month" variant="dot" />
            <LegendKey color="#c9c4b8" label="Other month" variant="dot" />
          </>
        ) : undefined
      }
    >
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="monthName" {...AXIS} />
        <YAxis
          tickFormatter={formatAxisPrice}
          width={52}
          axisLine={false}
          domain={["auto", "auto"]}
          {...AXIS}
        />
        <Tooltip
          cursor={{ fill: "#f4f2ed" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as MonthlyPoint;
            return (
              <TooltipCard
                title={point.monthName}
                rows={[
                  { label: "Average", value: formatPrice(point.averagePrice, currency), color },
                  ...(highlightWedding
                    ? [
                        {
                          label: "Wedding season",
                          value: point.isWeddingSeasonMonth ? "Yes" : "No",
                        },
                      ]
                    : []),
                ]}
              />
            );
          }}
        />
        <Bar dataKey="averagePrice" isAnimationActive={false} maxBarSize={40}>
          {data.map((point) => (
            <Cell
              key={point.month}
              fill={
                highlightWedding
                  ? point.isWeddingSeasonMonth
                    ? "#b08d3e"
                    : "#c9c4b8"
                  : color
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
