import { zodResolver } from "@hookform/resolvers/zod";
import {
  getGetAdminPromotionImageUrl,
  type AdminPromotionDto,
} from "@pilates/api-contracts";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useIdempotencyKey } from "../api/idempotency-key";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { SidePanelBody } from "../components/panel/side-panel";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { boliviaToday } from "../lib/bolivia-time";
import {
  imageChangeWarning,
  promotionSchema,
  windowStatus,
  type PromotionInput,
  type PromotionOutput,
} from "./promotion-form-schema";
import {
  PromotionImageField,
  type AttachedImage,
} from "./promotion-image-field";
import { imageUrlFor } from "./promotion-format";
import { PromotionPanelFooter } from "./promotion-panel-footer";
import { promotionFailureMessage } from "./promotion-problems";
import { usePromotionChange } from "./promotion-queries";

const attachedImage = (
  promotion: AdminPromotionDto | undefined,
): AttachedImage | null =>
  promotion?.image === null || promotion?.image === undefined
    ? null
    : {
        imageAssetId: promotion.image.imageAssetId,
        width: promotion.image.width,
        height: promotion.image.height,
        // AW18's attached preview reads the 1440 px private variant.
        previewUrl: imageUrlFor(
          getGetAdminPromotionImageUrl(promotion.id, {
            variant: "promotion_1440",
          }),
          promotion.image.imageAssetId,
        ),
        label: "Imagen actual",
      };

type Outcome = "draft" | "changes" | "publish";

const notices: Record<Outcome, string> = {
  draft: "guardada como borrador.",
  changes: "guardada.",
  publish: "publicada.",
};

/**
 * AW18 with follow-ups 39 and 60: image first, then Título, Descripción,
 * and the display window. A draft stays private until «Publicar»; on a
 * published Promotion, replacing or removing the image warns that it
 * unpublishes on save and must be published again.
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
  // Once created, a retry of «Publicar» publishes the saved row instead of
  // creating a second one.
  const [saved, setSaved] = useState(promotion);
  const [image, setImage] = useState(attachedImage(promotion));
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const publishable =
    image !== null &&
    [
      typed.headline,
      typed.description,
      typed.displayStartsOn,
      typed.displayEndsOn,
    ].every((value) => (value ?? "").trim() !== "");
  const imageChanged =
    (image?.imageAssetId ?? null) !== (saved?.image?.imageAssetId ?? null);
  const wasPublished = saved?.publishedAt != null;
  const published = wasPublished && !imageChanged;

  const run = async (work: () => Promise<string>) => {
    setFailure(null);
    try {
      onDone(await work());
    } catch (error) {
      setFailure(promotionFailureMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const persist = async (
    values: PromotionOutput,
  ): Promise<AdminPromotionDto> => {
    const input = { ...values, imageAssetId: image?.imageAssetId ?? null };
    const row = (
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
          })
    ) as AdminPromotionDto;
    setSaved(row);
    return row;
  };

  const save = (outcome: Outcome) =>
    form.handleSubmit((values) =>
      run(async () => {
        const row = await persist(values);
        if (outcome === "publish") {
          await change.mutateAsync({ kind: "publish", promotionId: row.id });
        }
        return `Promoción «${row.headline}» ${notices[outcome]}`;
      }),
    )();

  const unpublish = () =>
    run(async () => {
      if (saved === undefined) throw new Error("unsaved");
      await change.mutateAsync({ kind: "unpublish", promotionId: saved.id });
      return `Promoción «${saved.headline}» ya no se publica en la app.`;
    });

  // Delete archives the row and releases its image (BKM-001, ADR-0076).
  const remove = () =>
    run(async () => {
      if (saved === undefined) throw new Error("unsaved");
      await change.mutateAsync({ kind: "delete", promotionId: saved.id });
      return `Promoción «${saved.headline}» eliminada.`;
    });

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(published ? "changes" : "draft");
        }}
        noValidate
        className="flex flex-1 flex-col"
      >
        <SidePanelBody>
          <PromotionImageField value={image} onChange={setImage} />
          {wasPublished && imageChanged ? (
            <p className="rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-2 text-ayuda text-advertencia-texto">
              {imageChangeWarning(image !== null)}
            </p>
          ) : null}
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
          {wasPublished ? (
            <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
              {windowStatus(
                boliviaToday(),
                typed.displayStartsOn ?? "",
                typed.displayEndsOn ?? "",
              )}
            </p>
          ) : null}
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <PromotionPanelFooter
          published={published}
          publishable={publishable}
          pending={change.isPending}
          editing={saved !== undefined}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("publish")}
          onSaveChanges={() => void save("changes")}
          onUnpublish={() => void unpublish()}
          onDelete={() => setDeleting(true)}
        />
      </form>
      {saved === undefined ? null : (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={`¿Eliminar la promoción «${saved.headline}»?`}
          confirmLabel="Eliminar"
          pending={change.isPending}
          onConfirm={() => void remove()}
        >
          <p>
            Se quita del carrusel y de esta lista, y su imagen se borra. Esta
            acción no se puede deshacer.
          </p>
        </ConfirmDialog>
      )}
    </Form>
  );
}
