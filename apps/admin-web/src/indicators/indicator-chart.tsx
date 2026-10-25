import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatMonth } from "../lib/bolivia-time";

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
      className="m-0 flex flex-col gap-3 rounded-tarjeta border border-borde bg-blanco px-5 py-4"
    >
      <h2 className="text-titulo-panel text-texto">Clases dictadas</h2>
      <div className="h-48">
        <ResponsiveContainer width={480} height={192}>
          <BarChart
            data={points.map((point) => ({
              month: shortMonth(point.month),
              sessionsHeld: point.sessionsHeld,
            }))}
            accessibilityLayer
          >
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Bar dataKey="sessionsHeld" fill="#C4786A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
