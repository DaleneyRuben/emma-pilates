import type { EquipmentTypeDto } from "@pilates/api-contracts";
import { useId, useState, type FormEvent } from "react";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { selectedClass } from "../../components/ui/chip";
import { cn } from "../../lib/cn";
import { backOfficeProblem } from "../back-office-problems";
import { Failure, fieldError } from "./equipment-forms";
import { parseQuantity, trackingLong, typeInUse } from "./equipment-format";
import { useEquipmentChange } from "./equipment-queries";

type Tracking = EquipmentTypeDto["tracking"];

const trackingChoices: readonly (readonly [Tracking, string, string])[] = [
  [
    "unit",
    "Por unidad, con número",
    "Cada una tiene su número y sus fallas: Reformer 1, Reformer 2…",
  ],
  [
    "quantity",
    "Por cantidad",
    "Cuentas cuántas hay y cuántas están dañadas: Balones 12, 1 dañado.",
  ],
];

function NameField({
  id,
  value,
  error,
  onChange,
}: {
  id: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Nombre</Label>
      <Input
        id={id}
        maxLength={40}
        value={value}
        aria-invalid={error !== null}
        onChange={(event) => onChange(event.target.value)}
      />
      {error === null ? null : (
        <p role="alert" className={fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

const nameProblem = (error: unknown) => {
  const problem = backOfficeProblem(error);
  return problem.field === "name"
    ? { name: problem.message, failure: null }
    : { name: null, failure: problem.message };
};

// Follow-up 269 «Nuevo tipo»: a name, how it is kept (fixed for good), and
// for «Por cantidad» the selected Branch's starting count.
export function NewTypeForm({
  branch,
  onDone,
}: {
  branch: { id: string; name: string };
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branch.id);
  const nameId = useId();
  const quantityId = useId();
  const [name, setName] = useState("");
  const [tracking, setTracking] = useState<Tracking>("quantity");
  const [quantity, setQuantity] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const trimmed = name.trim();
    const count = parseQuantity(quantity);
    setNameError(trimmed === "" ? "Escribe un nombre." : null);
    setQuantityError(
      tracking === "quantity" && count === null
        ? "Escribe una cantidad del 0 al 9999."
        : null,
    );
    if (trimmed === "" || (tracking === "quantity" && count === null)) return;
    try {
      await change.mutateAsync({
        kind: "create-type",
        input:
          tracking === "unit"
            ? { name: trimmed, tracking }
            : {
                name: trimmed,
                tracking,
                branchId: branch.id,
                quantity: count ?? 0,
              },
      });
      onDone(`Creamos el tipo ${trimmed}.`);
    } catch (error) {
      const refusal = nameProblem(error);
      setNameError(refusal.name);
      setFailure(refusal.failure);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <NameField
          id={nameId}
          value={name}
          error={nameError}
          onChange={setName}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            ¿Cómo lo llevas?
          </legend>
          {trackingChoices.map(([value, title, note]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-tarjeta border border-borde bg-superficie px-4 py-3 has-focus-visible:shadow-foco",
                value === tracking && selectedClass,
              )}
            >
              <input
                type="radio"
                name="equipment-tracking"
                value={value}
                checked={value === tracking}
                onChange={() => setTracking(value)}
                className="mt-1 size-4 accent-primario"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-cuerpo font-medium text-texto">
                  {title}
                </span>
                <span className="text-ayuda text-texto-tenue">{note}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {tracking === "quantity" ? (
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={quantityId}
            >{`Cantidad en Sucursal ${branch.name}`}</Label>
            <Input
              id={quantityId}
              inputMode="numeric"
              placeholder="0"
              className="w-[140px]"
              value={quantity}
              aria-invalid={quantityError !== null}
              onChange={(event) => setQuantity(event.target.value.trim())}
            />
            {quantityError === null ? null : (
              <p role="alert" className={fieldError}>
                {quantityError}
              </p>
            )}
          </div>
        ) : null}
        <p className="text-ayuda text-texto-tenue">
          El tipo es para todo el estudio. Cómo se lleva no se puede cambiar
          después.
        </p>
        <Failure message={failure} />
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={change.isPending}>
          Crear tipo
        </Button>
      </SidePanelFooter>
    </form>
  );
}

// Follow-up 269 «Editar tipo»: rename it, or remove it once no Branch holds
// any (the server also counts the other Branches).
export function EditTypeForm({
  branchId,
  type,
  removable,
  onDone,
}: {
  branchId: string;
  type: EquipmentTypeDto;
  removable: boolean;
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branchId);
  const nameId = useId();
  const [name, setName] = useState(type.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError("Escribe un nombre.");
      return;
    }
    setNameError(null);
    try {
      await change.mutateAsync({
        kind: "rename-type",
        typeId: type.id,
        name: trimmed,
      });
      onDone(`Guardamos el tipo ${trimmed}.`);
    } catch (error) {
      const refusal = nameProblem(error);
      setNameError(refusal.name);
      setFailure(refusal.failure);
    }
  };

  const remove = async () => {
    setFailure(null);
    try {
      await change.mutateAsync({ kind: "archive-type", typeId: type.id });
      onDone(`Quitamos el tipo ${type.name}.`);
    } catch (error) {
      setConfirming(false);
      const problem = backOfficeProblem(error);
      setFailure(
        problem.code === "equipment_type_in_use"
          ? typeInUse[type.tracking]
          : problem.message,
      );
    }
  };

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <NameField
            id={nameId}
            value={name}
            error={nameError}
            onChange={setName}
          />
          <p className="text-ayuda text-texto-tenue">
            {`${trackingLong[type.tracking]} No se puede cambiar.`}
          </p>
          <div className="flex flex-col items-start gap-1.5 border-t border-divisor pt-4">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-error hover:text-error-texto disabled:bg-transparent"
              disabled={!removable}
              onClick={() => setConfirming(true)}
            >
              Quitar tipo
            </Button>
            <p className="text-ayuda text-texto-tenue">
              {removable
                ? "Deja de aparecer en todas las sucursales. Su historial queda."
                : typeInUse[type.tracking]}
            </p>
          </div>
          <Failure message={failure} />
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" size="lg" busy={change.isPending}>
            Guardar
          </Button>
        </SidePanelFooter>
      </form>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Quitar el tipo ${type.name}?`}
        confirmLabel="Quitar tipo"
        busy={change.isPending}
        onConfirm={() => void remove()}
      >
        <p>Deja de aparecer en todas las sucursales. Su historial queda.</p>
      </ConfirmDialog>
    </>
  );
}
