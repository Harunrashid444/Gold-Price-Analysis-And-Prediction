import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CorrelationPoint } from "../../api/types";
import { AXIS, ChartFrame, GRID, LegendKey, TooltipCard } from "./ChartKit";

/**
 * ACF / PACF correlogram.
 *
 * The shaded band is the standard ±1.96/√n significance envelope: bars inside
 * it are statistically indistinguishable from zero. `n` is the sample size of
 * the differenced series, which the API does not send, so it is passed in from
 * the dataset's observation count.
 */
export function CorrelogramChart({
  data,
  title,
  subtitle,
  sampleSize,
  color,
  height = 260,
}: {
  data: CorrelationPoint[];
  title: string;
  subtitle?: string;
  sampleSize: number;
  color: string;
  height?: number;
}) {
  const bound = sampleSize > 1 ? 1.96 / Math.sqrt(sampleSize) : 0;

  // Lag 0 is always exactly 1 by definition and would flatten the scale.
  const plotted = data.filter((d) => d.lag > 0);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      height={height}
      legend={
        <>
          <LegendKey color={color} label="Correlation" variant="dot" />
          <LegendKey color="#86827a" label="95% significance band" variant="area" />
        </>
      }
      footnote="Bars that stay inside the shaded band are not statistically different from zero at the 5% level. Lag 0 is omitted — it is always 1 by definition."
    >
      <BarChart data={plotted} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="lag" {...AXIS} />
        <YAxis width={46} axisLine={false} domain={[-1, 1]} {...AXIS} />
        {bound > 0 && (
          <ReferenceArea
            y1={-bound}
            y2={bound}
            fill="#86827a"
            fillOpacity={0.1}
            stroke="none"
          />
        )}
        <ReferenceLine y={0} stroke="#191815" strokeWidth={1} />
        <Tooltip
          cursor={{ fill: "#f4f2ed" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as CorrelationPoint;
            const significant = Math.abs(point.value) > bound;
            return (
              <TooltipCard
                title={`Lag ${point.lag}`}
                rows={[
                  { label: "Correlation", value: point.value.toFixed(4), color },
                  { label: "Significant", value: significant ? "Yes" : "No" },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="value" isAnimationActive={false} maxBarSize={9}>
          {plotted.map((point) => (
            <Cell
              key={point.lag}
              fill={Math.abs(point.value) > bound ? color : "#c9c4b8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
