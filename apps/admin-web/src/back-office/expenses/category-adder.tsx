import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminExpenseCategoryDto } from "@pilates/api-contracts";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { backOfficeProblem } from "../back-office-problems";
import { useCategoryChange } from "./expense-queries";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(60),
});
type CategoryInput = z.infer<typeof categorySchema>;

/**
 * AW15's inline "+ Agregar categoría" row, also opened from AW14's "+ Nueva
 * categoría" link. It is not a <form> of its own, so it can live inside the
 * Expense form: Enter or "Agregar" adds the label.
 */
export function CategoryAdder({
  autoFocus = false,
  onAdded,
}: {
  autoFocus?: boolean;
  onAdded: (category: AdminExpenseCategoryDto) => void;
}) {
  const change = useCategoryChange();
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const add = form.handleSubmit(async ({ name }) => {
    try {
      const category = await change.mutateAsync({ kind: "create", name });
      form.reset();
      if (category !== null) onAdded(category);
    } catch (error) {
      form.setError("name", { message: backOfficeProblem(error).message });
    }
  });

  return (
    <Form {...form}>
      <div className="flex items-start gap-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Nombre de la categoría</FormLabel>
              <FormControl>
                <Input
                  autoFocus={autoFocus}
                  placeholder="Limpieza"
                  {...field}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void add();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          variant="neutral"
          className="mt-[22px] h-[44px]"
          disabled={change.isPending}
          onClick={() => void add()}
        >
          Agregar
        </Button>
      </div>
    </Form>
  );
}
