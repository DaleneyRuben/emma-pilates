import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminPromotionDto } from "@pilates/api-contracts";
import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useIdempotencyKey } from "../api/idempotency-key";
import { civilDateField } from "../components/form/date-field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { SidePanelBody, SidePanelFooter } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { promotionFailureMessage } from "./promotion-problems";
import { usePromotionChange } from "./promotion-queries";

// The backend's copy limits (UPL-002: 80 and 280 characters after trimming)
// and an inclusive window whose end is never before its start.
const promotionSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1, "Escribe el título.")
      .max(80, "Escribe hasta 80 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "Escribe la descripción.")
      .max(280, "Escribe hasta 280 caracteres."),
    displayStartsOn: civilDateField("Elige la fecha de inicio."),
    displayEndsOn: civilDateField("Elige la fecha de fin."),
  })
  .refine((values) => values.displayEndsOn >= values.displayStartsOn, {
    path: ["displayEndsOn"],
    message: "La fecha de fin no puede ser anterior a la de inicio.",
  });
type PromotionInput = z.input<typeof promotionSchema>;
type PromotionOutput = z.output<typeof promotionSchema>;

/** The image the form will save: the current one or a freshly uploaded one. */
export type AttachedImage = {
  imageAssetId: string;
  width: number;
  height: number;
};

/**
 * AW18 with follow-ups 39 and 60: image first, then Título, Descripción,
 * and the display window; «Guardar borrador» keeps a private draft and
 * «Publicar» is disabled until the image, both texts, and both dates exist.
 */
export function PromotionPanelForm({
  promotion,
  onDone,
}: {
  promotion: AdminPromotionDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const change = usePromotionChange();
  const keyFor = useIdempotencyKey();
  const dropHintId = useId();
  // Once created, a retry of «Publicar» publishes the saved row instead of
  // creating a second one.
  const [saved, setSaved] = useState(promotion);
  const [image] = useState<AttachedImage | null>(
    promotion?.image === null || promotion?.image === undefined
      ? null
      : {
          imageAssetId: promotion.image.imageAssetId,
          width: promotion.image.width,
          height: promotion.image.height,
        },
  );
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<PromotionInput, unknown, PromotionOutput>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      headline: promotion?.headline ?? "",
      description: promotion?.description ?? "",
      displayStartsOn: promotion?.displayStartsOn ?? "",
      displayEndsOn: promotion?.displayEndsOn ?? "",
    },
  });
  const typed = useWatch({ control: form.control });
  const complete =
    image !== null &&
    [
      typed.headline,
      typed.description,
      typed.displayStartsOn,
      typed.displayEndsOn,
    ].every((value) => (value ?? "").trim() !== "");

  const persist = async (
    values: PromotionOutput,
  ): Promise<AdminPromotionDto> => {
    const input = { ...values, imageAssetId: image?.imageAssetId ?? null };
    const row =
      saved === undefined
        ? await change.mutateAsync({
            kind: "create",
            input,
            idempotencyKey: keyFor(input),
          })
        : await change.mutateAsync({
            kind: "update",
            promotionId: saved.id,
            input,
          });
    const result = row as AdminPromotionDto;
    setSaved(result);
    return result;
  };

  const submit = (publish: boolean) =>
    form.handleSubmit(async (values) => {
      setFailure(null);
      try {
        const row = await persist(values);
        if (publish) {
          await change.mutateAsync({ kind: "publish", promotionId: row.id });
          onDone(`Promoción «${row.headline}» publicada.`);
        } else {
          onDone(`Promoción «${row.headline}» guardada como borrador.`);
        }
      } catch (error) {
        setFailure(promotionFailureMessage(error));
      }
    });

  return (
    <Form {...form}>
      <form
        onSubmit={submit(false)}
        noValidate
        className="flex flex-1 flex-col"
      >
        <SidePanelBody>
          <div className="flex flex-col gap-1.5">
            <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
              Imagen
            </span>
            <div className="flex flex-col items-center gap-1 rounded-control border border-dashed border-borde-fuerte bg-superficie px-4 py-6 text-center">
              <button
                type="button"
                aria-describedby={dropHintId}
                className="flex flex-col items-center gap-1 rounded-control text-nota font-medium text-texto hover:text-primario focus-visible:shadow-foco"
              >
                <ImagePlus
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-primario"
                />
                Sube una imagen
              </button>
              <p id={dropHintId} className="text-ayuda text-texto-tenue">
                Arrastra el archivo o haz clic · JPG, PNG o WEBP horizontal,
                mínimo 1200 × 675 px
              </p>
            </div>
          </div>
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input maxLength={80} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea rows={3} maxLength={280} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 max-md:grid-cols-1">
            <FormField
              control={form.control}
              name="displayStartsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de inicio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayEndsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de fin</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Entre esas dos fechas la promoción aparece en el inicio de
                    la app; fuera del rango se guarda pero no se muestra.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={change.isPending}
            >
              Guardar borrador
            </Button>
            <Button
              size="lg"
              disabled={!complete || change.isPending}
              onClick={() => void submit(true)()}
            >
              Publicar
            </Button>
          </div>
        </SidePanelFooter>
      </form>
    </Form>
  );
}
