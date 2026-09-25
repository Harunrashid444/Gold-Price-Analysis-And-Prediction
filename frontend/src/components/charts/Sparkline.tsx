import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/**
 * Bare trend line for the dashboard market cards — no axes, no interaction.
 * Long series are thinned so the shape stays legible at small size.
 */
export function Sparkline({
  data,
  color,
  height = 44,
}: {
  data: Array<{ price: number }>;
  color: string;
  height?: number;
}) {
  const step = Math.max(1, Math.ceil(data.length / 140));
  const thinned = step === 1 ? data : data.filter((_, i) => i % step === 0);

  return (
    <div style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={thinned} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
