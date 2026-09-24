import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la sucursal."),
  address: z.string().trim().min(1, "Escribe la dirección."),
});

type BranchValues = z.infer<typeof branchSchema>;

function BranchForm({
  onSubmit,
}: {
  onSubmit: (values: BranchValues) => void;
}) {
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: "", address: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Como aparece en el selector.</FormDescription>
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
        <Button type="submit">Guardar sucursal</Button>
      </form>
    </Form>
  );
}

describe("form primitives", () => {
  it("labels each control, links its description, and keeps it valid before submission", () => {
    render(<BranchForm onSubmit={jest.fn()} />);

    const name = screen.getByRole("textbox", { name: "Nombre" });
    expect(name).toHaveAttribute("aria-invalid", "false");
    expect(name).toHaveAccessibleDescription("Como aparece en el selector.");
    // A field without helper text points at nothing until it has an error.
    expect(
      screen.getByRole("textbox", { name: "Dirección" }),
    ).not.toHaveAttribute("aria-describedby");
  });

  it("shows the Zod message under the field, marks it invalid, and keeps the typed values", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<BranchForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Norte");
    await user.click(screen.getByRole("button", { name: "Guardar sucursal" }));

    const address = screen.getByRole("textbox", { name: "Dirección" });
    expect(
      await screen.findByText("Escribe la dirección."),
    ).toBeInTheDocument();
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(address).toHaveAccessibleDescription("Escribe la dirección.");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "Norte",
    );
    expect(
      screen.queryByText("Escribe el nombre de la sucursal."),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the parsed values once every field validates", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<BranchForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByRole("textbox", { name: "Nombre" }),
      "  Norte ",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Dirección" }),
      "Av. Banzer km 6",
    );
    await user.click(screen.getByRole("button", { name: "Guardar sucursal" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: "Norte",
      address: "Av. Banzer km 6",
    });
  });
});
