import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ActualVsPredicted } from "../../api/types";
import {
  formatAxisPrice,
  formatMonth,
  formatPrice,
  formatShortMonth,
} from "../../lib/format";
import { AXIS, ChartFrame, GRID, LegendKey, TOOLTIP_CURSOR, TooltipCard } from "./ChartKit";

/** Test-set fit: actual price against what the model predicted for the same months. */
export function ActualVsPredictedChart({
  data,
  title,
  subtitle,
  currency,
  height = 300,
  footnote,
}: {
  data: ActualVsPredicted[];
  title: string;
  subtitle?: string;
  currency: string;
  height?: number;
  footnote?: string;
}) {
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      footnote={footnote}
      legend={
        <>
          <LegendKey color="#35505f" label="Actual" />
          <LegendKey color="#9e3b2c" label="Predicted" variant="dash" />
        </>
      }
    >
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" tickFormatter={formatShortMonth} minTickGap={40} {...AXIS} />
        <YAxis tickFormatter={formatAxisPrice} width={52} axisLine={false} domain={["auto", "auto"]} {...AXIS} />
        <Tooltip
          cursor={TOOLTIP_CURSOR}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as ActualVsPredicted;
            const error = point.predicted - point.actual;
            return (
              <TooltipCard
                title={formatMonth(point.date)}
                rows={[
                  { label: "Actual", value: formatPrice(point.actual, currency), color: "#35505f" },
                  { label: "Predicted", value: formatPrice(point.predicted, currency), color: "#9e3b2c" },
                  {
                    label: "Error",
                    value: `${error >= 0 ? "+" : ""}${formatPrice(error, currency)}`,
                  },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#35505f"
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: "#35505f" }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#9e3b2c"
          strokeWidth={1.75}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: "#9e3b2c" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  );
}
