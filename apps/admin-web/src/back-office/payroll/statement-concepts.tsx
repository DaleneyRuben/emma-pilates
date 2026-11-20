import type { PayStatementLineDto } from "@pilates/api-contracts";
import { formatBolivianos } from "../../lib/money";
import { conceptsOf, type PayConcept } from "./pay-statement-concepts";

// «Clases dictadas (1 × Bs 65,00)», «Comisiones de primer plan (2)», «Base
// mensual»: what each concept pays, in one short line.
const conceptName = (concept: PayConcept): string => {
  if (concept.key === "base" && concept.rate === "Mensual") {
    return "Base mensual";
  }
  if (concept.key === "bonus" && concept.rate === "Meta de renovación") {
    return concept.label;
  }
  if (concept.key === "commission") {
    return `${concept.label} (${concept.lines.length})`;
  }
  return `${concept.label} (${concept.rate})`;
};

// Follow-up 274, FIX-084 (Sueldos B): one line per concept with its
// subtotal; the card's «Ver las N líneas» opens every class or Client paid.
export function ConceptRows({ lines }: { lines: PayStatementLineDto[] }) {
  return (
    <ul className="flex flex-col">
      {conceptsOf(lines).map((concept) => (
        <li
          key={concept.key}
          className="flex items-baseline justify-between gap-3 border-b border-borde py-2.5 text-celda last:border-b-0"
        >
          <span className="min-w-0 text-texto">{conceptName(concept)}</span>
          <span className="tabular whitespace-nowrap text-texto">
            {formatBolivianos(concept.subtotalCentavos)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Every line of a statement, grouped in the concepts' order. */
export function StatementLines({
  id,
  lines,
}: {
  id: string;
  lines: PayStatementLineDto[];
}) {
  return (
    <ul
      id={id}
      className="max-h-[360px] overflow-y-auto rounded-control bg-superficie"
    >
      {conceptsOf(lines).flatMap((concept) =>
        concept.lines.map((line, index) => (
          // Lines have no identity of their own; their order is the statement's.
          <li
            key={`${concept.key}-${index}`}
            className="flex items-center justify-between gap-3 border-borde px-3 py-2 text-nota text-texto not-first:border-t"
          >
            <span className="min-w-0">{line.detail}</span>
            <span className="tabular whitespace-nowrap">
              {formatBolivianos(line.amountCentavos)}
            </span>
          </li>
        )),
      )}
    </ul>
  );
}
