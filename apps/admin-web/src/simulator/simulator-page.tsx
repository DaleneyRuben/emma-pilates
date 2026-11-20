import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { PageHeader } from "../components/page/page-header";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { StatTile } from "../components/ui/stat-tile";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import { staffProfileQueryOptions } from "../session/staff-profile-query";
import { ProjectionSection } from "./projection-section";
import { simulateMonth, type SimulatorInput } from "./simulate-month";

const cardClass =
  "flex flex-col gap-4 rounded-tarjeta bg-superficie shadow-tarjeta p-6 max-md:p-4";

// The owner's opening month: 33 classes a week, 4 students paying about Bs 70
// a class (diagnosis 3.4), Trainer pay of Bs 65 with up to 4 students and
// Bs 8 from the fifth (decisions section 8), fixed costs Bs 21,175, tax 16 %.
const opening = {
  classesPerWeek: "33",
  studentsPerClass: "4",
  clientPricePerClass: "70",
  trainerClassPay: "65",
  includedStudents: "4",
  extraStudentPay: "8",
  fixedCosts: "21175",
  taxRate: "16",
};

type Draft = typeof opening;

const whole = (text: string): number | null =>
  /^\d+$/.test(text.trim()) ? Number(text) : null;

const amount = (text: string): number | null => {
  const value = whole(text);
  return value === null ? null : value * 100;
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

// FIX-091 (W12 A): Entraría and Saldría under the result, one row each.
function Flow({ name, figure }: { name: string; figure: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-t border-borde px-4 py-3 first:border-t-0">
      <span className="text-celda">{name}</span>
      <span className="text-celda font-semibold tabular">{figure}</span>
    </li>
  );
}

// The draft as the calculation's input, or null while a field is not a
// whole number or the tax is 100 % or more.
function parseDraft(draft: Draft): SimulatorInput | null {
  const classesPerWeek = whole(draft.classesPerWeek);
  const studentsPerClass = whole(draft.studentsPerClass);
  const clientPricePerClassCentavos = amount(draft.clientPricePerClass);
  const classCentavos = amount(draft.trainerClassPay);
  const includedStudents = whole(draft.includedStudents);
  const extraStudentCentavos = amount(draft.extraStudentPay);
  const fixedCostsCentavos = amount(draft.fixedCosts);
  const taxRatePercent = whole(draft.taxRate);
  if (
    classesPerWeek === null ||
    studentsPerClass === null ||
    clientPricePerClassCentavos === null ||
    classCentavos === null ||
    includedStudents === null ||
    extraStudentCentavos === null ||
    fixedCostsCentavos === null ||
    taxRatePercent === null ||
    taxRatePercent >= 100
  ) {
    return null;
  }
  return {
    classesPerWeek,
    studentsPerClass,
    clientPricePerClassCentavos,
    trainerPay: { classCentavos, includedStudents, extraStudentCentavos },
    fixedCostsCentavos,
    taxRatePercent,
  };
}

function Result({ input }: { input: SimulatorInput }) {
  const { fixedCostsCentavos, taxRatePercent } = input;
  const month = simulateMonth(input);
  return (
    <div className="flex flex-col gap-3">
      <StatTile
        label="Quedaría al mes"
        tone="destacado"
        figure={formatSignedBolivianos(month.resultCentavos)}
        line={`${month.classes} clases · ingreso ${formatBolivianos(month.incomeCentavos)}`}
      />
      <ul
        aria-label="Entraría y saldría"
        className="flex flex-col rounded-tarjeta bg-superficie shadow-tarjeta text-rosa-600"
      >
        <Flow name="Entraría" figure={formatBolivianos(month.incomeCentavos)} />
        <Flow
          name="Saldría"
          figure={formatBolivianos(
            month.taxCentavos +
              fixedCostsCentavos +
              month.variableCostsCentavos,
          )}
        />
      </ul>
      <StatTile
        label="Punto de equilibrio"
        figure={formatBolivianos(month.breakEvenCentavos)}
        line="Ingreso en caja que cubre los costos fijos, el pago a instructoras y el impuesto"
      />
      {/* FIX-088: the owner's check in words and bolivianos. */}
      <p className="text-nota text-texto tabular">
        {`(costos fijos ${formatBolivianos(fixedCostsCentavos)} + pago a instructoras ${formatBolivianos(month.variableCostsCentavos)}) ÷ (1 − ${taxRatePercent} % de impuesto) = ${formatBolivianos(month.breakEvenCentavos)}`}
      </p>
    </div>
  );
}

// AW42 «Simulador» (STU-004, ADR-0103). AW37 is Equipos. The calculation lives in
// @pilates/studio-economics and nothing leaves the browser.
export function SimulatorPage() {
  const profile = useQuery(staffProfileQueryOptions());
  const [draft, setDraft] = useState(opening);
  const change = (key: keyof Draft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const assumptionsId = useId();
  const input = parseDraft(draft);

  if (profile.data !== undefined && profile.data.role !== "administrator") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Simulador" />
        <p
          role="alert"
          className="rounded-tarjeta bg-superficie shadow-tarjeta px-6 py-10 text-center text-cuerpo text-texto"
        >
          No tienes permiso para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Simulador"
        subtitle="Prueba un mes con otros números. Nada se guarda: es un cálculo de este momento."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={assumptionsId} className={cardClass}>
          <h2
            id={assumptionsId}
            className="font-sans text-etiqueta-campo font-semibold tracking-[0.14em] text-rosa-600 uppercase"
          >
            Tus supuestos
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Clases por semana"
              value={draft.classesPerWeek}
              onChange={change("classesPerWeek")}
            />
            <Field
              label="Clientas por clase"
              value={draft.studentsPerClass}
              onChange={change("studentsPerClass")}
            />
            <Field
              label="Precio por clase para la clienta (Bs)"
              value={draft.clientPricePerClass}
              onChange={change("clientPricePerClass")}
            />
            <Field
              label="Pago por clase a la instructora (Bs)"
              value={draft.trainerClassPay}
              onChange={change("trainerClassPay")}
            />
            <Field
              label="Clientas incluidas en el pago"
              value={draft.includedStudents}
              onChange={change("includedStudents")}
            />
            <Field
              label="Pago por clienta extra (Bs)"
              value={draft.extraStudentPay}
              onChange={change("extraStudentPay")}
            />
            <Field
              label="Costos fijos (Bs)"
              value={draft.fixedCosts}
              onChange={change("fixedCosts")}
            />
            <Field
              label="Impuestos (%)"
              value={draft.taxRate}
              onChange={change("taxRate")}
            />
          </div>
        </section>
        {input === null ? (
          <p role="alert" className="text-ayuda text-texto">
            Escribe números enteros. El impuesto tiene que ser menor que 100.
          </p>
        ) : (
          <Result input={input} />
        )}
      </div>
      {input === null ? null : <ProjectionSection input={input} />}
    </div>
  );
}
