import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { PageHeader } from "../components/page/page-header";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { cn } from "../lib/cn";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import { staffProfileQueryOptions } from "../session/staff-profile-query";
import { ProjectionSection } from "./projection-section";
import { simulateMonth } from "./simulate-month";

const cardClass =
  "flex flex-col gap-4 rounded-tarjeta border border-borde bg-blanco p-6 max-md:p-4";

// The owner's opening month: 33 classes a week, 4 students, Bs 65 a class,
// fixed costs Bs 21,175, tax 16 %.
const opening = {
  classesPerWeek: "33",
  studentsPerClass: "4",
  pricePerClass: "65",
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

function Figure({
  name,
  figure,
  line,
  rule,
}: {
  name: string;
  figure: string;
  line: string;
  rule: string;
}) {
  return (
    <section
      aria-label={name}
      className={cn(
        "flex flex-col gap-1.5 rounded-tarjeta border border-borde border-t-[3px] bg-blanco px-5 py-4",
        rule,
      )}
    >
      <h2 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {name}
      </h2>
      <p className="font-serif text-[32px] leading-tight text-texto tabular">
        {figure}
      </p>
      <p className="text-nota text-texto-tenue">{line}</p>
    </section>
  );
}

function Calculator({ draft }: { draft: Draft }) {
  const classesPerWeek = whole(draft.classesPerWeek);
  const studentsPerClass = whole(draft.studentsPerClass);
  const pricePerClassCentavos = amount(draft.pricePerClass);
  const fixedCostsCentavos = amount(draft.fixedCosts);
  const taxRatePercent = whole(draft.taxRate);
  const ready =
    classesPerWeek !== null &&
    studentsPerClass !== null &&
    pricePerClassCentavos !== null &&
    fixedCostsCentavos !== null &&
    taxRatePercent !== null &&
    taxRatePercent < 100;
  if (!ready) {
    return (
      <p role="alert" className="text-ayuda text-error-texto">
        Escribe números enteros. El impuesto tiene que ser menor que 100.
      </p>
    );
  }
  const month = simulateMonth({
    classesPerWeek,
    studentsPerClass,
    pricePerClassCentavos,
    fixedCostsCentavos,
    taxRatePercent,
  });
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Figure
          name="Resultado"
          rule={month.resultCentavos < 0 ? "border-t-error" : "border-t-exito"}
          figure={formatSignedBolivianos(month.resultCentavos)}
          line={`${month.classes} clases · ingreso ${formatBolivianos(month.incomeCentavos)}`}
        />
        <Figure
          name="Punto de equilibrio"
          rule="border-t-texto"
          figure={formatBolivianos(month.breakEvenCentavos)}
          line="Ingreso en caja que cubre los costos fijos, el pago a instructoras y el impuesto"
        />
      </div>
      <p className="text-nota text-texto-tenue tabular">{month.derivation}</p>
      <ProjectionSection
        input={{
          classesPerWeek,
          studentsPerClass,
          pricePerClassCentavos,
          fixedCostsCentavos,
          taxRatePercent,
        }}
      />
    </>
  );
}

// AW42 «Simulador» (STU-004, ADR-0103). AW37 is Equipos. The calculation lives in
// @pilates/studio-economics and nothing leaves the browser.
export function SimulatorPage() {
  const profile = useQuery(staffProfileQueryOptions());
  const [draft, setDraft] = useState(opening);
  const change = (key: keyof Draft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  if (profile.data !== undefined && profile.data.role !== "administrator") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Simulador" />
        <p
          role="alert"
          className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario"
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
      <section className={cardClass}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Clases por semana"
            value={draft.classesPerWeek}
            onChange={change("classesPerWeek")}
          />
          <Field
            label="Alumnas por clase"
            value={draft.studentsPerClass}
            onChange={change("studentsPerClass")}
          />
          <Field
            label="Precio por clase (Bs)"
            value={draft.pricePerClass}
            onChange={change("pricePerClass")}
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
      <Calculator draft={draft} />
    </div>
  );
}
