import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminBranchDto } from "@pilates/api-contracts";
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
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { useBranchChange } from "./branch-queries";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(80),
  address: z.string().trim().min(1, "Escribe la dirección.").max(160),
});

type BranchValues = z.infer<typeof branchSchema>;

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) return "No pudimos guardar. Inténtalo de nuevo.";
  switch (error.code) {
    case "branch_in_use":
      return "No puedes archivarla: tiene sesiones programadas o un horario semanal vigente.";
    case "branch_not_found":
      return "Esta sucursal ya no existe. Cierra el panel y vuelve a abrir la lista.";
    case "invalid_request":
    case "invalid_catalog_value":
      return "Revisa los datos: hay un valor que no es válido.";
    case "administration_access_denied":
      return "No tienes permiso para cambiar sucursales.";
    default:
      return "No pudimos guardar. Inténtalo de nuevo.";
  }
};

// AW20: name and address; an existing Branch can also be archived, which
// the backend refuses while upcoming work still depends on it (ADM-001 A1).
export function BranchPanelForm({
  branch,
  onDone,
}: {
  branch: AdminBranchDto | undefined;
  onDone: () => void;
}) {
  const change = useBranchChange();
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: branch?.name ?? "", address: branch?.address ?? "" },
  });

  const submit = form.handleSubmit(async (input) => {
    setFailure(null);
    try {
      await change.mutateAsync(
        branch === undefined
          ? { kind: "create", input }
          : { kind: "update", branchId: branch.id, input },
      );
      onDone();
    } catch (error) {
      setFailure(failureMessage(error));
    }
  });

  const archive = async () => {
    if (branch === undefined) return;
    setFailure(null);
    try {
      await change.mutateAsync({ kind: "archive", branchId: branch.id });
      setConfirming(false);
      onDone();
    } catch (error) {
      setConfirming(false);
      setFailure(failureMessage(error));
    }
  };

  const archived = branch?.archivedAt != null;

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Equipetrol" {...field} />
                </FormControl>
                <FormDescription>
                  {branch === undefined
                    ? "Aparecerá en el selector de sucursal al guardarla."
                    : undefined}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {branch === undefined ? null : (
            <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
              Esta sucursal ya aparece en el selector de la barra superior y en
              cada registro del Back Office que depende de ella (sesiones,
              insumos, gastos); renombrarla no mueve esos datos.
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
          {branch === undefined || archived ? null : (
            <Button
              variant="link"
              className="self-center text-error hover:text-error-texto"
              onClick={() => setConfirming(true)}
            >
              Archivar sucursal
            </Button>
          )}
        </SidePanelFooter>
      </form>
      {branch === undefined ? null : (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`¿Archivar ${branch.name}?`}
          confirmLabel="Archivar"
          busy={change.isPending}
          onConfirm={() => void archive()}
        >
          <p>
            Deja de aparecer en el selector y no recibe sesiones nuevas. Su
            historial se conserva.
          </p>
        </ConfirmDialog>
      )}
    </Form>
  );
}
