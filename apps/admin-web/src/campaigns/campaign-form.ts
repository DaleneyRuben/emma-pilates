import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { wholeNumberField } from "../components/form/number-field";

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la campaña.").max(80),
  classes: wholeNumberField(1, 4, "De 1 a 4 clases."),
});

export type CampaignInput = z.input<typeof campaignSchema>;
export type CampaignOutput = z.output<typeof campaignSchema>;
export type CampaignForm = UseFormReturn<
  CampaignInput,
  unknown,
  CampaignOutput
>;

/** The classes typed for each Client, or null while they are not 1 to 4. */
export const classesEach = (typed: string): number | null => {
  const parsed = campaignSchema.shape.classes.safeParse(typed);
  return parsed.success ? parsed.data : null;
};
