import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatMonth } from "../lib/bolivia-time";

// FIX-089: Recharts paints SVG attributes, so the palette's hex goes in
// directly (Palo de rosa bars, Rosa profundo ticks).
const paloDeRosa = "#b78380";
const rosaProfundo = "#93615d";

const shortMonth = (month: string) => {
  const name = formatMonth(month);
  return `${name.charAt(0).toLocaleUpperCase("es")}${name.slice(1, 3)}`;
};

export function IndicatorChart({
  points,
}: {
  points: readonly { month: string; sessionsHeld: number }[];
}) {
  return (
    <figure
      aria-label="Clases dictadas"
      className="m-0 flex min-w-0 flex-col gap-3 rounded-marco border border-borde bg-lino px-5 py-4"
    >
      <h2 className="text-titulo-panel text-texto">Clases dictadas</h2>
      {/* FIX-088: as wide as the card, never past a 420 px screen. */}
      <div className="h-48 w-full max-w-[480px] min-w-0">
        <ResponsiveContainer
          width="100%"
          height={192}
          initialDimension={{ width: 480, height: 192 }}
        >
          <BarChart
            data={points.map((point) => ({
              month: shortMonth(point.month),
              sessionsHeld: point.sessionsHeld,
            }))}
            accessibilityLayer
          >
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: rosaProfundo }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: rosaProfundo }}
            />
            <Bar
              dataKey="sessionsHeld"
              fill={paloDeRosa}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
