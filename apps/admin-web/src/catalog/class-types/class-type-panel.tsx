import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminClassTypeDto } from "@pilates/api-contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "../../api/problem";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { wholeNumberField } from "../../components/form/number-field";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useClassTypeChange } from "./class-type-queries";

const classTypeSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(80),
  description: z.string().trim().min(1, "Escribe una descripción.").max(280),
  defaultCapacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares."),
  equipmentNeeds: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value === "" ? null : value)),
});

type ClassTypeInput = z.input<typeof classTypeSchema>;
type ClassTypeOutput = z.output<typeof classTypeSchema>;

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) return "No pudimos guardar. Inténtalo de nuevo.";
  switch (error.code) {
    case "class_type_in_use":
      return "No puedes archivarlo: un horario semanal vigente lo usa.";
    case "class_type_not_found":
      return "Este tipo de clase ya no existe. Cierra el panel y vuelve a abrir la lista.";
    case "invalid_request":
    case "invalid_catalog_value":
      return "Revisa los datos: hay un valor que no es válido.";
    case "administration_access_denied":
      return "No tienes permiso para cambiar el catálogo.";
    default:
      return "No pudimos guardar. Inténtalo de nuevo.";
  }
};

const textFields = [
  ["name", "Nombre", "Reformer Pilates"],
  ["defaultCapacity", "Capacidad", "10"],
  ["equipmentNeeds", "Equipo necesario", "Reformer"],
] as const;

const helpers: Partial<Record<keyof ClassTypeInput, string>> = {
  defaultCapacity:
    "Capacidad por defecto; cada sesión puede ajustarla desde el horario.",
};

// AW07 with follow-up 39 §2: the description is required because it is what
// the Client reads on the Session detail; edits never rewrite existing
// Sessions (ADR-0059).
export function ClassTypePanelForm({
  classType,
  onDone,
}: {
  classType: AdminClassTypeDto | undefined;
  onDone: () => void;
}) {
  const change = useClassTypeChange();
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const form = useForm<ClassTypeInput, unknown, ClassTypeOutput>({
    resolver: zodResolver(classTypeSchema),
    defaultValues: {
      name: classType?.name ?? "",
      description: classType?.description ?? "",
      defaultCapacity:
        classType === undefined ? "" : String(classType.defaultCapacity),
      equipmentNeeds: classType?.equipmentNeeds ?? "",
    },
  });

  const run = async (work: () => Promise<unknown>) => {
    setFailure(null);
    try {
      await work();
      onDone();
    } catch (error) {
      if (isApiError(error) && error.code === "class_type_name_taken") {
        form.setError("name", {
          message: "Ya existe un tipo de clase activo con ese nombre.",
        });
      } else {
        setFailure(failureMessage(error));
      }
    } finally {
      setConfirming(false);
    }
  };

  const submit = form.handleSubmit((input) =>
    run(() =>
      change.mutateAsync(
        classType === undefined
          ? { kind: "create", input }
          : { kind: "update", classTypeId: classType.id, input },
      ),
    ),
  );

  const [nameField, ...numberFields] = textFields;
  const renderText = ([
    name,
    label,
    placeholder,
  ]: (typeof textFields)[number]) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              inputMode={
                name === "name" || name === "equipmentNeeds"
                  ? undefined
                  : "numeric"
              }
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormDescription>{helpers[name]}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          {renderText(nameField)}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormDescription>
                  Una o dos frases que la clienta lee en el detalle de la
                  sesión.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {numberFields.map(renderText)}
          {classType === undefined ? null : (
            <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
              Los cambios se aplican a las sesiones que se generen desde ahora;
              las ya programadas no cambian.
            </p>
          )}
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" size="lg" busy={change.isPending}>
            Guardar
          </Button>
          {classType === undefined || classType.archivedAt !== null ? null : (
            <Button
              variant="link"
              className="self-center text-error hover:text-error-texto"
              onClick={() => setConfirming(true)}
            >
              Archivar tipo de clase
            </Button>
          )}
        </SidePanelFooter>
      </form>
      {classType === undefined ? null : (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`¿Archivar ${classType.name}?`}
          confirmLabel="Archivar"
          busy={change.isPending}
          onConfirm={() =>
            void run(() =>
              change.mutateAsync({
                kind: "archive",
                classTypeId: classType.id,
              }),
            )
          }
        >
          <p>
            Ya no se podrá elegir para sesiones nuevas. Las sesiones que ya
            existen se mantienen.
          </p>
        </ConfirmDialog>
      )}
    </Form>
  );
}
