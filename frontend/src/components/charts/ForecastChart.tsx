import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "../../api/types";
import {
  formatAxisPrice,
  formatMonth,
  formatPrice,
  formatShortMonth,
} from "../../lib/format";
import { AXIS, ChartFrame, GRID, LegendKey, TOOLTIP_CURSOR, TooltipCard } from "./ChartKit";

interface Row {
  date: string;
  price?: number;
  predictedPrice?: number;
  band?: [number, number];
  isForecast: boolean;
}

/**
 * Twelve-month forecast shown against recent history.
 *
 * The last historical month is duplicated into the forecast series so the two
 * lines meet instead of leaving a visual gap — that anchor point is the real
 * observed price, not a prediction.
 */
export function ForecastChart({
  historical,
  points,
  color,
  currency,
  historyMonths = 48,
  height = 360,
  footnote,
}: {
  historical: Array<{ date: string; price: number }>;
  points: ForecastPoint[];
  color: string;
  currency: string;
  historyMonths?: number;
  height?: number;
  footnote?: string;
}) {
  const { rows, boundaryDate } = useMemo(() => {
    const tail = historical.slice(-historyMonths);
    const last = tail[tail.length - 1];

    const historyRows: Row[] = tail.map((point, index) => ({
      date: point.date,
      price: point.price,
      // Anchor the forecast line to the final observed value.
      predictedPrice: index === tail.length - 1 ? point.price : undefined,
      band: index === tail.length - 1 ? [point.price, point.price] : undefined,
      isForecast: false,
    }));

    const forecastRows: Row[] = points.map((point) => ({
      date: point.date,
      predictedPrice: point.predictedPrice,
      band: [point.lowerBound, point.upperBound],
      isForecast: true,
    }));

    return { rows: [...historyRows, ...forecastRows], boundaryDate: last?.date };
  }, [historical, points, historyMonths]);

  return (
    <ChartFrame
      height={height}
      footnote={footnote}
      title="Forecast against recent history"
      subtitle={`Last ${historyMonths} observed months and the ${points.length}-month projection`}
      legend={
        <>
          <LegendKey color={color} label="Observed" />
          <LegendKey color="#9e3b2c" label="Forecast" variant="dash" />
          <LegendKey color="#8a6d2f" label="Approx. band" variant="area" />
        </>
      }
    >
      <ComposedChart data={rows} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" tickFormatter={formatShortMonth} minTickGap={44} {...AXIS} />
        <YAxis
          tickFormatter={formatAxisPrice}
          width={52}
          axisLine={false}
          domain={["auto", "auto"]}
          {...AXIS}
        />

        <Area
          dataKey="band"
          stroke="none"
          fill="#8a6d2f"
          fillOpacity={0.16}
          isAnimationActive={false}
          connectNulls
        />

        {boundaryDate && (
          <ReferenceLine
            x={boundaryDate}
            stroke="#86827a"
            strokeDasharray="3 3"
            label={{
              value: "Forecast begins",
              position: "insideTopRight",
              fill: "#86827a",
              fontSize: 10,
            }}
          />
        )}

        <Line
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="predictedPrice"
          stroke="#9e3b2c"
          strokeWidth={1.75}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: "#9e3b2c" }}
          connectNulls
          isAnimationActive={false}
        />

        <Tooltip
          cursor={TOOLTIP_CURSOR}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Row;

            if (!row.isForecast) {
              return (
                <TooltipCard
                  title={formatMonth(row.date)}
                  rows={[
                    { label: "Observed", value: formatPrice(row.price ?? 0, currency), color },
                  ]}
                />
              );
            }

            const [low, high] = row.band ?? [0, 0];
            return (
              <TooltipCard
                title={`${formatMonth(row.date)} · forecast`}
                rows={[
                  {
                    label: "Predicted",
                    value: formatPrice(row.predictedPrice ?? 0, currency),
                    color: "#9e3b2c",
                  },
                  { label: "Upper", value: formatPrice(high, currency) },
                  { label: "Lower", value: formatPrice(low, currency) },
                ]}
              />
            );
          }}
        />
      </ComposedChart>
    </ChartFrame>
  );
}
