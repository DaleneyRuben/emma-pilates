import { useContext } from "react";
import { useFormState } from "react-hook-form";
import { FormLabelsContext } from "./form-context";
import { invalidFields, missingDataTitle, summaryLabels } from "./form-errors";

/**
 * FIX-089 (FormB): the Rubor box at the top of a form that failed to save,
 * «Faltan N datos para guardar» over the missing fields' labels. Forms
 * outside React Hook Form pass the labels themselves.
 */
export function FormErrorSummaryBox({
  labels,
  announce = true,
}: {
  labels: readonly string[];
  /** False where each field's own message is already an alert. */
  announce?: boolean;
}) {
  if (labels.length === 0) return null;
  return (
    <div
      role={announce ? "alert" : undefined}
      data-slot="form-error-summary"
      className="flex flex-col gap-1 rounded-boton bg-aviso px-[18px] py-3.5 text-texto inset-ring-2 inset-ring-primario"
    >
      <p className="text-fila font-bold">{missingDataTitle(labels.length)}</p>
      <p className="text-celda">{labels.join(" · ")}</p>
    </div>
  );
}

/** An unlabelled control's own name: its aria-label or its label's text. */
const controlName = (path: string): string | undefined => {
  const [control] = document.getElementsByName(path);
  if (control === undefined) return undefined;
  const label =
    control.getAttribute("aria-label") ??
    (control as HTMLInputElement).labels?.[0]?.textContent ??
    undefined;
  return label?.trim() === "" ? undefined : label?.trim();
};

/** The summary of a `Form`, shown from its first save attempt on. */
export function FormErrorSummary() {
  const { errors, submitCount } = useFormState();
  const labels = useContext(FormLabelsContext);
  if (submitCount === 0) return null;
  return (
    <FormErrorSummaryBox
      labels={summaryLabels(
        invalidFields(errors),
        labels?.current() ?? new Map<string, string>(),
        controlName,
      )}
    />
  );
}
