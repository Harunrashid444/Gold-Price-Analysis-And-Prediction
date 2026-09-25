import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "../../api/types";
import { formatAxisPrice, formatMonth, formatPrice, formatYear } from "../../lib/format";
import { AXIS, ChartFrame, GRID, LegendKey, TOOLTIP_CURSOR, TooltipCard } from "./ChartKit";

interface Props {
  data: PricePoint[];
  color: string;
  currency: string;
  maWindow: number;
  title?: string;
  subtitle?: string;
  height?: number;
}

/**
 * Historical monthly price with the pipeline's moving-average trend line.
 * `movingAverage` is absent on the first N points (the window warm-up), which
 * Recharts renders as a gap — correct, since no trend value exists there.
 */
export function PriceChart({
  data,
  color,
  currency,
  maWindow,
  title,
  subtitle,
  height = 340,
}: Props) {
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      legend={
        <>
          <LegendKey color={color} label="Monthly price" />
          <LegendKey color="#9e3b2c" label={`${maWindow}-month moving average`} variant="dash" />
        </>
      }
    >
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="date"
          tickFormatter={formatYear}
          minTickGap={44}
          {...AXIS}
        />
        <YAxis
          tickFormatter={formatAxisPrice}
          width={52}
          axisLine={false}
          domain={["auto", "auto"]}
          {...AXIS}
        />
        <Tooltip
          cursor={TOOLTIP_CURSOR}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as PricePoint;
            return (
              <TooltipCard
                title={formatMonth(point.date)}
                rows={[
                  { label: "Price", value: formatPrice(point.price, currency), color },
                  ...(point.movingAverage !== undefined
                    ? [
                        {
                          label: `${maWindow}-mo avg`,
                          value: formatPrice(point.movingAverage, currency),
                          color: "#9e3b2c",
                        },
                      ]
                    : []),
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="movingAverage"
          stroke="#9e3b2c"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  );
}
