import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "../api/problem";
import { wholeNumberField } from "../components/form/number-field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import {
  grantedLine,
  recipientLine,
  skippedLine,
  skippedPreview,
} from "./campaign-copy";
import {
  campaignPreviewQueryOptions,
  useCampaignGrant,
} from "./campaign-queries";

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la campaña.").max(80),
  classes: wholeNumberField(1, 4, "Entre 1 y 4 clases."),
});

type CampaignInput = z.input<typeof campaignSchema>;
type CampaignOutput = z.output<typeof campaignSchema>;

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) {
    return "No pudimos dar las clases. Inténtalo de nuevo.";
  }
  if (error.code === "administration_access_denied") {
    return "No tienes permiso para crear una campaña.";
  }
  return "No pudimos dar las clases. Inténtalo de nuevo.";
};

const cardClass =
  "flex flex-col gap-4 rounded-tarjeta border border-borde bg-blanco p-6 max-md:p-4";

// AW21 (BKM-015): the Administrator grants extra classes for a campaign, a
// start of year or a holiday, to every Client with a live Plan. A Client
// without one is named and skipped. Never a discount.
export function CampaignPage() {
  const preview = useQuery(campaignPreviewQueryOptions());
  const grant = useCampaignGrant();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<{
    granted: number;
    classes: number;
    skipped: string | null;
  } | null>(null);
  const form = useForm<CampaignInput, unknown, CampaignOutput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", classes: "1" },
  });

  const submit = form.handleSubmit((values) => {
    setFailure(null);
    setConfirming(true);
    form.reset(values, { keepValues: true });
  });

  const confirm = async () => {
    const values = campaignSchema.parse(form.getValues());
    try {
      const granted = await grant.mutateAsync(values);
      setResult({
        granted: granted.granted.length,
        classes: granted.classes,
        skipped: skippedLine(granted.skipped),
      });
      setConfirming(false);
    } catch (error) {
      setFailure(failureMessage(error));
      setConfirming(false);
    }
  };

  const skipped =
    preview.data === undefined ? null : skippedPreview(preview.data.skipped);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Campaña"
        subtitle="Clases extra para el inicio de año o las vacaciones. No cambia ningún precio."
      />
      {result === null ? null : (
        <PageNotice>
          {`${grantedLine(result.granted, result.classes)} ${result.skipped ?? ""}`.trim()}
        </PageNotice>
      )}
      {failure === null ? null : (
        <p role="alert" className="text-nota text-error">
          {failure}
        </p>
      )}
      {preview.isPending ? (
        <p className="text-nota text-texto-tenue">Cargando las clientas…</p>
      ) : preview.isError ? (
        <QueryFailure
          error={preview.error}
          what="las clientas de la campaña"
          onRetry={() => void preview.refetch()}
        />
      ) : (
        <section className={cardClass}>
          <p className="text-nota text-texto-secundario">
            {recipientLine(preview.data.recipientCount)}
          </p>
          {skipped === null ? null : (
            <p className="text-nota text-texto-tenue">{skipped}</p>
          )}
          <Form {...form}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la campaña</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clases extra</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormDescription>Entre 1 y 4 clases.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="self-start">
                Dar las clases
              </Button>
            </form>
          </Form>
        </section>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Dar las clases de campaña?"
        confirmLabel="Confirmar campaña"
        tone="primary"
        busy={grant.isPending}
        onConfirm={() => void confirm()}
      >
        <p>
          Cada clienta con un plan vigente recibe las clases. Una clienta sin
          plan vigente no recibe nada, y ningún precio cambia.
        </p>
      </ConfirmDialog>
    </div>
  );
}
