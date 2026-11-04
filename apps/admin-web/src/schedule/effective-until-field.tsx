import type { ComponentProps } from "react";
import { CivilDateInput } from "../components/form/civil-date-input";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";

// BKM-018: «Vigente hasta (opcional)», empty for a series with no end.
export function EffectiveUntilItem(
  field: ComponentProps<typeof CivilDateInput>,
) {
  return (
    <FormItem>
      <FormLabel>Vigente hasta (opcional)</FormLabel>
      <FormControl>
        <CivilDateInput {...field} placeholder="Sin fecha de fin" />
      </FormControl>
      <FormDescription>
        Sin fecha de fin, la serie sigue cada semana hasta que la pauses o la
        termines.
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}
