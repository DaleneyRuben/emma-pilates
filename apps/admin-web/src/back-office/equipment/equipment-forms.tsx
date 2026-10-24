import { useId, useState, type FormEvent } from "react";
import { ChoiceChips } from "../../components/form/choice-chips";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { backOfficeProblem } from "../back-office-problems";
import {
  equipmentKinds,
  equipmentName,
  type EquipmentKind,
} from "./equipment-format";
import { useEquipmentChange } from "./equipment-queries";

const fieldError = "text-ayuda text-error-texto";

function Failure({ message }: { message: string | null }) {
  return message === null ? null : (
    <p role="alert" className="text-nota text-error-texto">
      {message}
    </p>
  );
}

// AW37 «Nuevo equipo»: a kind and a number from 1 to 99, unique per Branch
// and kind among the pieces not retired.
export function NewEquipmentForm({
  branchId,
  onDone,
}: {
  branchId: string;
  onDone: (notice: string) => void;
}) {
  const change = useEquipmentChange(branchId);
  const numberId = useId();
  const [kind, setKind] = useState<EquipmentKind>("reformer");
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const parsed = /^\d{1,2}$/.test(number) ? Number(number) : null;
  const valid = parsed !== null && parsed >= 1;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    if (!valid) {
      setNumberError("Escribe un número del 1 al 99.");
      return;
    }
    setNumberError(null);
    const name = equipmentName(kind, parsed);
    try {
      await change.mutateAsync({
        kind: "create",
        input: { branchId, kind, number: parsed },
      });
      onDone(`Agregamos ${name}.`);
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.code === "equipment_number_taken") {
        setNumberError(`Ya hay un ${name} en esta sucursal.`);
      } else {
        setFailure(problem.message);
      }
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <SidePanelBody>
        <div className="flex flex-col gap-1.5">
          <p className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            Tipo
          </p>
          <ChoiceChips
            legend="Tipo"
            name="equipment-kind"
            value={kind}
            options={equipmentKinds}
            onChange={setKind}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={numberId}>Número</Label>
          <Input
            id={numberId}
            inputMode="numeric"
            placeholder="9"
            className="w-[120px]"
            value={number}
            aria-invalid={numberError !== null}
            aria-describedby={`${numberId}-help`}
            onChange={(event) => setNumber(event.target.value.trim())}
          />
          <p id={`${numberId}-help`} className="text-ayuda text-texto-tenue">
            {valid
              ? `Se mostrará como ${equipmentName(kind, parsed)}.`
              : "Del 1 al 99, único por tipo en esta sucursal."}
          </p>
          {numberError === null ? null : (
            <p role="alert" className={fieldError}>
              {numberError}
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

// AW37 «Registrar falla»: what happened and whether the piece can be used.
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={descriptionId}>¿Qué pasó?</Label>
          <Textarea
            id={descriptionId}
            maxLength={500}
            placeholder="Ej.: el resorte rojo se soltó"
            value={description}
            aria-invalid={descriptionError !== null}
            onChange={(event) => setDescription(event.target.value)}
          />
          {descriptionError === null ? null : (
            <p role="alert" className={fieldError}>
              {descriptionError}
            </p>
          )}
        </div>
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
            <label htmlFor={outId} className="text-cuerpo text-texto">
              No se puede usar
            </label>
            <p id={`${outId}-help`} className="text-ayuda text-texto-tenue">
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
