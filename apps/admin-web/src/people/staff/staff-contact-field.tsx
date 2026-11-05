import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { Input } from "../../components/ui/input";
import type { StaffFormInput, StaffFormOutput } from "./staff-form-schema";

const fields = {
  name: { label: "Nombre", type: "text", autoComplete: "off" },
} as const;

// FIX-038: «Editar miembro» draws the name with the same field as «Nuevo
// miembro»; the phone is FIX-037's `PhoneFormField`.
// They describe another person, so the browser offers no autofill.
export function StaffContactField({
  control,
  name,
}: {
  control: Control<StaffFormInput, unknown, StaffFormOutput>;
  name: keyof typeof fields;
}) {
  const { label, type, autoComplete } = fields[name];
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
