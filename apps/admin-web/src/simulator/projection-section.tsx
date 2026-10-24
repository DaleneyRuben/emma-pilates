import {
  projectMonths,
  type ProjectionScenario,
} from "@pilates/studio-economics/project-months";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import type { SimulatorInput } from "./simulate-month";

const scenarioLabel: Record<ProjectionScenario, string> = {
  low: "Bajo",
  base: "Base",
  high: "Alto",
};

const Amount = ({ label, children }: { label: string; children: string }) => (
  <TableCell data-label={label} className="tabular md:text-right">
    {children}
  </TableCell>
);

// STU-005. Computed from the form in the browser. There is no request, so
// the section has no loading spinner and no network error of its own.
export function ProjectionSection({ input }: { input: SimulatorInput }) {
  const rows = projectMonths(input);
  return (
    <section aria-label="Proyección" className="flex flex-col gap-3">
      <h2 className="text-titulo-panel text-texto">Proyección</h2>
      <p className="text-nota text-texto-tenue">
        El mes de arriba se repite. Bajo es el 80 % de las alumnas y Alto el 120
        %, con un tope de 12 por clase.
      </p>
      <Table aria-label="Proyección a 3, 6 y 12 meses">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Meses</TableHead>
            <TableHead>Escenario</TableHead>
            <TableHead className="text-right">Ingreso</TableHead>
            <TableHead className="text-right">Costos</TableHead>
            <TableHead className="text-right">Impuesto</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={`${row.months}-${row.scenario}`}
              aria-label={`${row.months} meses ${scenarioLabel[row.scenario]}`}
            >
              <TableCell data-label="Meses">{row.months}</TableCell>
              <TableCell data-label="Escenario">
                {scenarioLabel[row.scenario]}
              </TableCell>
              <Amount label="Ingreso">
                {formatBolivianos(row.revenueCentavos)}
              </Amount>
              <Amount label="Costos">
                {formatBolivianos(row.costCentavos)}
              </Amount>
              <Amount label="Impuesto">
                {formatBolivianos(row.taxCentavos)}
              </Amount>
              <Amount label="Resultado">
                {formatSignedBolivianos(row.resultCentavos)}
              </Amount>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
