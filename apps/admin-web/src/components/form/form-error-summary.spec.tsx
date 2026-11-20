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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { FormErrorSummary, FormErrorSummaryBox } from "./form-error-summary";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre."),
  address: z.string().trim().min(1, "Escribe la dirección."),
});

type Values = z.infer<typeof schema>;

function BranchForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)} noValidate>
        <FormErrorSummary />
        {(["name", "address"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {name === "name" ? "Nombre" : "Dirección"}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}

describe("FormErrorSummary (FIX-089, FormB)", () => {
  it("says nothing before the first save", () => {
    render(<BranchForm />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("counts and names the missing fields at the top on save", async () => {
    const user = userEvent.setup();
    render(<BranchForm />);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Faltan 2 datos para guardar");
    expect(summary).toHaveTextContent("Nombre · Dirección");
    expect(screen.getByLabelText("Nombre")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Escribe el nombre.")).toHaveClass(
      "tipo-secundario",
    );
  });

  it("shrinks as fields are fixed and leaves once all are", async () => {
    const user = userEvent.setup();
    render(<BranchForm />);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await user.type(screen.getByLabelText("Nombre"), "Equipetrol");
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Falta 1 dato para guardar");
    expect(summary).toHaveTextContent("Dirección");
    expect(summary).not.toHaveTextContent("Nombre");

    await user.type(screen.getByLabelText("Dirección"), "Av. Busch");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("FormErrorSummaryBox", () => {
  it("draws the labels it is given, for forms outside React Hook Form", () => {
    render(<FormErrorSummaryBox labels={["Número"]} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Falta 1 dato para guardar",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Número");
  });

  it("draws nothing without labels", () => {
    render(<FormErrorSummaryBox labels={[]} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
