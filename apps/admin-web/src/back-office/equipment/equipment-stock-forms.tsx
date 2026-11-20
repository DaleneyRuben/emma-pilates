import type { EquipmentStockDto } from "@pilates/api-contracts";
import { Minus, Plus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { fieldMessageClass } from "../../components/form/form";
import { FormErrorSummaryBox } from "../../components/form/form-error-summary";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { backOfficeProblem } from "../back-office-problems";
import { DescriptionField, Failure } from "./equipment-forms";
import { damagedLabel, parseQuantity } from "./equipment-format";
import { useBranchStock, useEquipmentChange } from "./equipment-queries";

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-1.5"
    >
      <span
        id={labelId}
        className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto uppercase"
      >
        ¿Cuántos?
      </span>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="neutral"
          size="icon"
          aria-label="Uno menos"
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={18} strokeWidth={1.8} aria-hidden="true" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-10 text-center font-serif text-[24px] text-texto tabular"
        >
          {value}
        </span>
        <Button
          type="button"
          variant="neutral"
          size="icon"
          aria-label="Uno más"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </div>
      <p className="text-ayuda text-texto">{`De ${max} que se pueden usar.`}</p>
    </div>
  );
}

// Follow-up 269 «Registrar daño»: how many (1 up to the usable ones) and
// what happened; it is an open fault like a machine's.
export function DamageForm({
  branchId,
  stock: snapshot,
  onDone,
}: {
  branchId: string;
  stock: EquipmentStockDto;
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branchId);
  const stock = useBranchStock(branchId, snapshot);
  const descriptionId = useId();
  const [count, setCount] = useState(1);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [exceeds, setExceeds] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setExceeds(false);
    const text = description.trim();
    if (text === "") {
      setDescriptionError("Cuenta qué pasó.");
      return;
    }
    setDescriptionError(null);
    try {
      await change.mutateAsync({
        kind: "damage",
        input: {
          branchId,
          typeId: stock.typeId,
          quantity: count,
          description: text,
        },
      });
      onDone(`Registramos ${damagedLabel(count)} en ${stock.typeName}.`);
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.code === "equipment_damage_exceeds_usable") {
        setExceeds(true);
      } else {
        setFailure(problem.message);
      }
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <FormErrorSummaryBox
          announce={false}
          labels={descriptionError === null ? [] : ["¿Qué pasó?"]}
        />
        <Stepper value={count} max={stock.usable} onChange={setCount} />
        <DescriptionField
          id={descriptionId}
          example="uno se pinchó"
          value={description}
          error={descriptionError}
          onChange={setDescription}
        />
        <Failure
          message={
            exceeds ? `Solo hay ${stock.usable} que se pueden usar.` : failure
          }
        />
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={change.isPending}>
          Registrar daño
        </Button>
      </SidePanelFooter>
    </form>
  );
}

// Follow-up 269 «Cambiar cantidad»: the Branch's total, damaged included,
// never below the open damage.
export function QuantityForm({
  branch,
  stock: snapshot,
  onDone,
}: {
  branch: { id: string; name: string };
  stock: EquipmentStockDto;
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branch.id);
  const stock = useBranchStock(branch.id, snapshot);
  const quantityId = useId();
  const [quantity, setQuantity] = useState(String(snapshot.quantity));
  const [problem, setProblem] = useState<"invalid" | "below" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const error =
    problem === "invalid"
      ? "Escribe una cantidad del 0 al 9999."
      : problem === "below"
        ? `No puede ser menor que los dañados (${stock.damaged}).`
        : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const count = quantity === "" ? null : parseQuantity(quantity);
    if (count === null) {
      setProblem("invalid");
      return;
    }
    if (count < stock.damaged) {
      setProblem("below");
      return;
    }
    setProblem(null);
    try {
      await change.mutateAsync({
        kind: "set-stock",
        input: { branchId: branch.id, typeId: stock.typeId, quantity: count },
      });
      onDone(`${stock.typeName}: ahora son ${count}.`);
    } catch (refusal) {
      const answer = backOfficeProblem(refusal);
      if (answer.code === "equipment_quantity_below_damaged") {
        setProblem("below");
      } else {
        setFailure(answer.message);
      }
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <FormErrorSummaryBox
          announce={false}
          labels={error === null ? [] : [`Cantidad en Sucursal ${branch.name}`]}
        />
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={quantityId}
          >{`Cantidad en Sucursal ${branch.name}`}</Label>
          <Input
            id={quantityId}
            inputMode="numeric"
            className="w-[140px]"
            value={quantity}
            aria-invalid={error !== null}
            aria-describedby={`${quantityId}-help`}
            onChange={(event) => setQuantity(event.target.value.trim())}
          />
          <p id={`${quantityId}-help`} className="text-ayuda text-texto">
            Cuenta también los dañados. Si se perdieron o se botaron, baja el
            número.
          </p>
          {error === null ? null : (
            <p role="alert" className={fieldMessageClass}>
              {error}
            </p>
          )}
        </div>
        <Failure message={failure} />
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={change.isPending}>
          Guardar
        </Button>
      </SidePanelFooter>
    </form>
  );
}
