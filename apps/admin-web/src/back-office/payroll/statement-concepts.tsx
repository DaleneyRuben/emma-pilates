import type { PayStatementLineDto } from "@pilates/api-contracts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment, useState } from "react";
import { formatBolivianos } from "../../lib/money";
import { conceptsOf, type PayConcept } from "./pay-statement-concepts";

// What one line of each concept is called, to name its toggle («Ver las 54
// canceladas por mínimo»). Base and the bonus are one line with nothing more
// to show, so they never open.
const names: Record<string, [string, string]> = {
  class: ["clase dictada", "clases dictadas"],
  minimum_not_met: ["cancelada por mínimo", "canceladas por mínimo"],
  commission: ["comisión", "comisiones"],
  new_client: ["clienta nueva", "clientas nuevas"],
  other: ["línea", "líneas"],
};

const toggleNames = (concept: PayConcept) => {
  const [one, many] = names[concept.key] ?? ["línea", "líneas"];
  const count = concept.lines.length;
  return count === 1
    ? { shown: "Ver 1", label: `Ver la ${one}` }
    : { shown: `Ver las ${count}`, label: `Ver las ${count} ${many}` };
};

function ConceptLines({ lines }: { lines: PayStatementLineDto[] }) {
  return (
    <ul className="max-h-[360px] overflow-y-auto rounded-tarjeta bg-superficie">
      {lines.map((line, index) => (
        // Lines have no identity of their own; their order is the statement's.
        <li
          key={index}
          className="flex items-center justify-between gap-3 border-divisor px-4 py-2 text-nota text-texto not-first:border-t"
        >
          <span className="min-w-0">{line.detail}</span>
          <span className="tabular whitespace-nowrap">
            {formatBolivianos(line.amountCentavos)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Follow-up 274 (option A): one row per concept with count × rate and
// subtotal; a row opens in place to the class or Client each line pays.
export function StatementConcepts({
  name,
  lines,
  totalCentavos,
}: {
  name: string;
  lines: PayStatementLineDto[];
  totalCentavos: number;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <table className="w-full border-t border-divisor text-cuerpo">
      <caption className="sr-only">{`Sueldo de ${name} por concepto`}</caption>
      <tbody>
        {conceptsOf(lines).map((concept) => {
          const opens = names[concept.key] !== undefined;
          const isOpen = opens && open[concept.key] === true;
          const toggle = toggleNames(concept);
          return (
            <Fragment key={concept.key}>
              <tr className="border-b border-divisor">
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left font-semibold md:px-5"
                >
                  <span className="flex flex-wrap items-center gap-x-2">
                    {concept.label}
                    {opens ? (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={
                          isOpen
                            ? `Ocultar ${toggle.label.slice(4)}`
                            : toggle.label
                        }
                        onClick={() =>
                          setOpen((current) => ({
                            ...current,
                            [concept.key]: !isOpen,
                          }))
                        }
                        className="inline-flex h-9 items-center gap-1 rounded-tarjeta px-2 text-celda font-semibold text-primario-profundo hover:bg-primario-tinte focus-visible:shadow-foco"
                      >
                        {isOpen ? (
                          <ChevronUp size={16} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={16} aria-hidden="true" />
                        )}
                        {isOpen ? "Ocultar" : toggle.shown}
                      </button>
                    ) : null}
                  </span>
                  <span className="block text-nota font-normal text-texto-tenue">
                    {concept.rate}
                  </span>
                </th>
                <td className="tabular px-4 py-2.5 text-right whitespace-nowrap md:px-5">
                  {formatBolivianos(concept.subtotalCentavos)}
                </td>
              </tr>
              {isOpen ? (
                <tr className="border-b border-divisor">
                  <td colSpan={2} className="px-2 pb-3 md:px-3">
                    <ConceptLines lines={concept.lines} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
        <tr>
          <th
            scope="row"
            className="px-4 py-2.5 text-left font-semibold md:px-5"
          >
            Total
          </th>
          <td className="tabular px-4 py-2.5 text-right font-semibold whitespace-nowrap md:px-5">
            {formatBolivianos(totalCentavos)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
