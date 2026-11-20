import type { CampaignPreviewDto } from "@pilates/api-contracts";
import { useWatch } from "react-hook-form";
import { ExampleHint } from "../components/form/example-hint";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { FormErrorSummary } from "../components/form/form-error-summary";
import {
  SidePanel,
  SidePanelBody,
  SidePanelFooter,
} from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { FilterChips } from "../components/ui/filter-chips";
import { InlineError } from "../components/ui/inline-error";
import { Input } from "../components/ui/input";
import {
  giveLabel,
  owedLine,
  pastCampaignLine,
  recipientLine,
  totalLine,
} from "./campaign-copy";
import { classesEach, type CampaignForm } from "./campaign-form";

// Only the audience that exists today (FIX-064): every active Client, the
// ones without a current Plan collecting the classes with their next one.
const everyActiveClient = "active";

function Summary({
  preview,
  total,
}: {
  preview: CampaignPreviewDto;
  total: number | null;
}) {
  const owed = owedLine(preview.owed ?? []);
  return (
    <section
      aria-label="Resumen"
      className="flex flex-col gap-1.5 rounded-tarjeta bg-aviso px-4 py-3.5 text-texto inset-ring-[1.5px] inset-ring-borde-fuerte"
    >
      {total === null ? null : (
        <p className="tipo-titulo-fila">{totalLine(total)}</p>
      )}
      <p className="tipo-compacto">{recipientLine(preview.recipientCount)}</p>
      {owed === null ? null : <p className="tipo-compacto">{owed}</p>}
      <p className="tipo-compacto">No se puede deshacer.</p>
    </section>
  );
}

// FIX-091 (W13 A): the campaign's form in a side panel, with who receives it
// and how many classes it gives in total before «Regalar». The page keeps
// the confirmation and the grant.
export function CampaignPanel({
  open,
  onOpenChange,
  form,
  preview,
  failure,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CampaignForm;
  preview: CampaignPreviewDto;
  failure: string | null;
  onSubmit: () => void;
}) {
  const typedName = useWatch({ control: form.control, name: "name" });
  const typedClasses = useWatch({ control: form.control, name: "classes" });
  const each = classesEach(typedClasses);
  const total = each === null ? null : each * preview.recipientCount;
  // An older backend answers without `pastCampaigns`.
  const repeated = pastCampaignLine(typedName, preview.pastCampaigns ?? []);

  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="Nueva campaña">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(() => onSubmit())}
          noValidate
          className="flex flex-1 flex-col"
        >
          <SidePanelBody>
            <FormErrorSummary />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la campaña</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    <ExampleHint example="Navidad 2026" />
                  </FormDescription>
                  <FormMessage />
                  {repeated === null ? null : (
                    <p
                      role="status"
                      className="rounded-tarjeta bg-aviso px-4 py-3 tipo-compacto text-texto"
                    >
                      {repeated}
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="classes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clases para cada clienta</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormDescription>De 1 a 4 clases.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <p className="tipo-compacto-600 text-texto">Quiénes la reciben</p>
              <FilterChips
                label="Quiénes la reciben"
                value={everyActiveClient}
                options={[
                  {
                    value: everyActiveClient,
                    label: "Clientas activas",
                    count: preview.recipientCount,
                  },
                ]}
                onChange={() => undefined}
              />
            </div>
            <Summary preview={preview} total={total} />
          </SidePanelBody>
          <SidePanelFooter>
            {failure === null ? null : <InlineError>{failure}</InlineError>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              {/* FIX-064 (finding 90): only when there is no active Client. */}
              <Button type="submit" disabled={preview.recipientCount === 0}>
                {giveLabel(total)}
              </Button>
            </div>
          </SidePanelFooter>
        </form>
      </Form>
    </SidePanel>
  );
}
