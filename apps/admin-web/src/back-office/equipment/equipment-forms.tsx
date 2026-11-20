import { useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { fieldMessageClass } from "../../components/form/form";
import { FormErrorSummaryBox } from "../../components/form/form-error-summary";
import { Button } from "../../components/ui/button";
import { InlineError } from "../../components/ui/inline-error";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { backOfficeProblem } from "../back-office-problems";
import { firstFreeNumber, unitName } from "./equipment-format";
import {
  branchEquipmentQueryOptions,
  useEquipmentChange,
} from "./equipment-queries";

export function Failure({ message }: { message: string | null }) {
  return message === null ? null : <InlineError>{message}</InlineError>;
}

// AW37 «Agregar» (follow-up 270): the type's first free number filled in,
// a number its units already use warned while typing, and the server's
// refusal kept for a number taken meanwhile, whose refresh then names the
// unit that took it.
export function AddUnitForm({
  branchId,
  type,
  onDone,
}: {
  branchId: string;
  type: { id: string; name: string };
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branchId);
  const units = useQuery(branchEquipmentQueryOptions(branchId));
  const numbers = (units.data ?? [])
    .filter((piece) => piece.typeId === type.id)
    .map((piece) => piece.number);
  const numberId = useId();
  const free = firstFreeNumber(numbers);
  const [number, setNumber] = useState(String(free));
  const [takenMeanwhile, setTakenMeanwhile] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const parsed =
    /^\d{1,2}$/.test(number) && Number(number) >= 1 ? Number(number) : null;
  const taken = parsed !== null && numbers.includes(parsed);
  const refused = parsed !== null && parsed === takenMeanwhile;
  const invalid = taken || refused;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (parsed === null || invalid) return;
    setFailure(null);
    try {
      await change.mutateAsync({
        kind: "create",
        input: { branchId, typeId: type.id, number: parsed },
      });
      onDone(`Agregamos ${unitName(type.name, parsed)}.`);
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.code === "equipment_number_taken") {
        setTakenMeanwhile(parsed);
      } else {
        setFailure(problem.message);
      }
    }
  };

  const help = taken
    ? `Ya hay un ${unitName(type.name, parsed)} en esta sucursal. El primer número libre es el ${free}.`
    : refused
      ? `Ya hay un ${unitName(type.name, parsed)} en esta sucursal.`
      : parsed === null
        ? "Del 1 al 99, único por tipo en esta sucursal."
        : `Se mostrará como ${unitName(type.name, parsed)}.`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={numberId}>Número</Label>
          <Input
            id={numberId}
            inputMode="numeric"
            className="w-[140px]"
            value={number}
            aria-invalid={invalid}
            aria-describedby={`${numberId}-help`}
            onChange={(event) => setNumber(event.target.value.trim())}
          />
          {invalid ? (
            <p
              key="taken"
              id={`${numberId}-help`}
              role="alert"
              className={fieldMessageClass}
            >
              {help}
            </p>
          ) : (
            <p
              key="help"
              id={`${numberId}-help`}
              className="tipo-secundario text-texto"
            >
              {help}
            </p>
          )}
        </div>
        <Failure message={failure} />
      </SidePanelBody>
      <SidePanelFooter>
        <Button
          type="submit"
          size="lg"
          busy={change.isPending}
          disabled={parsed === null || invalid}
        >
          Agregar
        </Button>
      </SidePanelFooter>
    </form>
  );
}

// AW37 «Registrar falla»: what happened and whether the unit can be used.
export function ReportIssueForm({
  branchId,
  equipment,
  onDone,
}: {
  branchId: string;
  equipment: { id: string; name: string };
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branchId);
  const descriptionId = useId();
  const outId = useId();
  const [description, setDescription] = useState("");
  const [outOfService, setOutOfService] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const text = description.trim();
    if (text === "") {
      setDescriptionError("Cuenta qué pasó.");
      return;
    }
    setDescriptionError(null);
    try {
      await change.mutateAsync({
        kind: "report",
        equipmentId: equipment.id,
        description: text,
        outOfService,
      });
      onDone(`Registramos la falla de ${equipment.name}.`);
    } catch (error) {
      setFailure(backOfficeProblem(error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <FormErrorSummaryBox
          announce={false}
          labels={descriptionError === null ? [] : ["¿Qué pasó?"]}
        />
        <DescriptionField
          id={descriptionId}
          example="el resorte rojo se soltó"
          value={description}
          error={descriptionError}
          onChange={setDescription}
        />
        <div className="flex items-start gap-2.5">
          <input
            id={outId}
            type="checkbox"
            checked={outOfService}
            onChange={(event) => setOutOfService(event.target.checked)}
            aria-describedby={`${outId}-help`}
            className="mt-0.5 size-4 accent-primario"
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor={outId} className="tipo-cuerpo text-texto">
              No se puede usar
            </label>
            <p id={`${outId}-help`} className="tipo-secundario text-texto">
              Márcalo si nadie debería usarlo hasta que lo arreglen.
            </p>
          </div>
        </div>
        <Failure message={failure} />
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={change.isPending}>
          Registrar
        </Button>
      </SidePanelFooter>
    </form>
  );
}

/** «¿Qué pasó?», shared by a unit's fault and a stock's damage. */
export function DescriptionField({
  id,
  example,
  value,
  error,
  onChange,
}: {
  id: string;
  example: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>¿Qué pasó?</Label>
      <Textarea
        id={id}
        maxLength={500}
        value={value}
        aria-invalid={error !== null}
        aria-describedby={`${id}-example`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-example`} className="tipo-secundario text-texto">
        {`Ej.: ${example}`}
      </p>
      {error === null ? null : (
        <p role="alert" className={fieldMessageClass}>
          {error}
        </p>
      )}
    </div>
  );
}
