import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { Form } from "./form";
import { PhoneFormField } from "./phone-field";
import { phoneValue, requiredPhone, type PhoneValue } from "./phone-value";

const schema = z.object({ phone: requiredPhone });

function PhoneForm({
  stored,
  onSubmit,
}: {
  stored?: string | null;
  onSubmit: (values: z.output<typeof schema>) => void;
}) {
  const form = useForm<{ phone: PhoneValue }, unknown, z.output<typeof schema>>(
    {
      resolver: zodResolver(schema),
      defaultValues: { phone: phoneValue(stored) },
    },
  );
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <PhoneFormField
          control={form.control}
          name="phone"
          description="La recepción lo usa para escribirle por WhatsApp."
        />
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}

const setup = (stored?: string | null) => {
  const sent: unknown[] = [];
  const user = userEvent.setup();
  render(
    <PhoneForm stored={stored} onSubmit={(values) => sent.push(values)} />,
  );
  return { sent, user };
};

const prefix = (name: string) => screen.getByRole("button", { name });

// FIX-037 (follow-up 236, boards A5–A6): «Celular» with a tappable country
// prefix; the number is sent as «+<code> <digits>».
describe("PhoneFormField", () => {
  it("starts in Bolivia and sends the number with its code", async () => {
    const { sent, user } = setup();

    const digits = screen.getByLabelText("Celular");
    expect(digits).toHaveAttribute("placeholder", "8 dígitos");
    expect(digits).toHaveAccessibleDescription(
      "La recepción lo usa para escribirle por WhatsApp.",
    );
    expect(prefix("País: Bolivia, +591")).toHaveTextContent("🇧🇴+591");

    await user.type(digits, "7123 4567");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(sent).toEqual([{ phone: "+591 71234567" }]);
  });

  it("asks for the number and says the country's rule", async () => {
    const { sent, user } = setup();

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(
        "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Celular")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await user.type(screen.getByLabelText("Celular"), "8123456");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(
        "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
      ),
    ).toBeVisible();
    expect(sent).toEqual([]);
  });

  it("lists the chosen country, the frequent ones, then every country A–Z", async () => {
    const { user } = setup();

    await user.click(prefix("País: Bolivia, +591"));
    const popover = await screen.findByRole("dialog", {
      name: "Elige el país",
    });

    expect(
      within(popover).getByLabelText("Buscar país o código"),
    ).toHaveFocus();
    const chosen = within(popover).getByRole("option", { selected: true });
    expect(chosen).toHaveAccessibleName("Bolivia +591");
    const frequent = within(popover).getByRole("group", { name: "Frecuentes" });
    expect(
      within(frequent)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "🇦🇷Argentina+54",
      "🇧🇷Brasil+55",
      "🇨🇱Chile+56",
      "🇵🇪Perú+51",
      "🇵🇾Paraguay+595",
    ]);
    const all = within(popover).getByRole("group", {
      name: "Todos los países",
    });
    expect(within(all).getAllByRole("option")[0]).toHaveAccessibleName(
      "Alemania +49",
    );
  });

  it("picks a country from the search with the keyboard", async () => {
    const { sent, user } = setup();

    await user.click(prefix("País: Bolivia, +591"));
    await user.keyboard("peru");
    const popover = screen.getByRole("dialog", { name: "Elige el país" });
    expect(
      within(popover)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["🇵🇪Perú+51"]);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(
      screen.queryByRole("dialog", { name: "Elige el país" }),
    ).not.toBeInTheDocument();
    const digits = screen.getByLabelText("Celular");
    expect(digits).toHaveFocus();
    expect(digits).toHaveAttribute("placeholder", "9 dígitos");
    expect(prefix("País: Perú, +51")).toBeVisible();

    await user.type(digits, "81234");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText(
        "Un celular de Perú tiene 9 dígitos y empieza con 9.",
      ),
    ).toBeVisible();

    await user.clear(digits);
    await user.type(digits, "912 345 678");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(sent).toEqual([{ phone: "+51 912345678" }]);
  });

  it("finds a country by its code and closes on Escape", async () => {
    const { user } = setup();

    await user.click(prefix("País: Bolivia, +591"));
    await user.keyboard("+595");
    expect(screen.getByRole("option", { name: "Paraguay +595" })).toBeVisible();
    await user.keyboard("zz");
    expect(screen.getByText("No encontramos ese país.")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Elige el país" }),
    ).not.toBeInTheDocument();
    expect(prefix("País: Bolivia, +591")).toHaveFocus();
  });

  it("reads a stored foreign number back into its country", async () => {
    const { sent, user } = setup("+54 91123456789");

    expect(prefix("País: Argentina, +54")).toBeVisible();
    expect(screen.getByLabelText("Celular")).toHaveValue("91123456789");
    expect(screen.getByLabelText("Celular")).toHaveAttribute(
      "placeholder",
      "11 dígitos",
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(sent).toEqual([{ phone: "+54 91123456789" }]);
  });
});
