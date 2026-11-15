import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { boliviaToday, formatCivilDate } from "../../lib/bolivia-time";
import { CivilDateInput } from "./civil-date-input";

// Finding 83, follow-up 266 (265's option A): a small month calendar opens
// under every admin web date field; typing «dd/mm/aaaa» keeps working.
type Extra = Omit<ComponentProps<typeof CivilDateInput>, "value" | "onChange">;

function Field({ initial = "", ...extra }: { initial?: string } & Extra) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="fecha">Fecha</label>
      <CivilDateInput id="fecha" value={value} onChange={setValue} {...extra} />
      <output aria-label="Valor">{value}</output>
      <button type="button">Fuera</button>
    </>
  );
}

const setup = (props: Parameters<typeof Field>[0] = {}) => {
  const user = userEvent.setup();
  render(<Field {...props} />);
  return { user, field: screen.getByRole("textbox", { name: "Fecha" }) };
};

const calendar = () => screen.getByRole("dialog", { name: "Calendario" });
const day = (name: string) =>
  within(calendar()).getByRole("button", { name: new RegExp(`^${name}`) });

describe("CivilDateInput calendar (finding 83)", () => {
  it("opens under the field on its month, writes the picked day and closes", async () => {
    const { user, field } = setup({ initial: "2026-11-20" });
    expect(
      screen.queryByRole("dialog", { name: "Calendario" }),
    ).not.toBeInTheDocument();

    await user.click(field);

    expect(within(calendar()).getByText("Noviembre 2026")).toBeVisible();
    expect(day("viernes, 20 de noviembre de 2026")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(field).toHaveFocus();

    await user.click(day("jueves, 26 de noviembre de 2026"));

    expect(field).toHaveValue("26/11/2026");
    expect(screen.getByRole("status", { name: "Valor" })).toHaveTextContent(
      "2026-11-26",
    );
    expect(
      screen.queryByRole("dialog", { name: "Calendario" }),
    ).not.toBeInTheDocument();
  });

  it("toggles from its button, moves between months, and keeps typing in sync", async () => {
    const { user, field } = setup({ initial: "2026-11-20" });
    const button = screen.getByRole("button", {
      name: "Elegir en el calendario",
    });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(
      within(calendar()).getByRole("button", { name: "Mes siguiente" }),
    );
    expect(within(calendar()).getByText("Diciembre 2026")).toBeVisible();
    await user.click(
      within(calendar()).getByRole("button", { name: "Mes anterior" }),
    );
    await user.click(
      within(calendar()).getByRole("button", { name: "Mes anterior" }),
    );
    expect(within(calendar()).getByText("Octubre 2026")).toBeVisible();

    await user.click(field);
    await user.clear(field);
    await user.type(field, "03022027");
    expect(within(calendar()).getByText("Febrero 2027")).toBeVisible();
    expect(day("miércoles, 3 de febrero de 2027")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(button);
    expect(
      screen.queryByRole("dialog", { name: "Calendario" }),
    ).not.toBeInTheDocument();
  });

  it("strikes the days after its last allowed day and says why when one is clicked", async () => {
    const { user, field } = setup({
      initial: "2026-11-12",
      max: "2026-11-15",
      maxReason: "La fecha no puede ser posterior a hoy.",
    });
    await user.click(field);

    const late = day("lunes, 16 de noviembre de 2026");
    expect(late).toHaveAttribute("aria-disabled", "true");
    expect(late).toHaveAccessibleName(
      "lunes, 16 de noviembre de 2026, no disponible",
    );
    expect(day("domingo, 15 de noviembre de 2026")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await user.click(late);

    expect(
      within(calendar()).getByText("La fecha no puede ser posterior a hoy."),
    ).toBeVisible();
    expect(field).toHaveValue("12/11/2026");
  });

  it("opens an end date on the start's month with the range drawn and earlier days off", async () => {
    const { user, field } = setup({
      rangeStart: "2026-11-20",
      min: "2026-11-20",
      minReason: "La fecha de fin no puede ser anterior a la de inicio.",
      align: "end",
    });
    await user.click(field);

    expect(within(calendar()).getByText("Noviembre 2026")).toBeVisible();
    expect(day("viernes, 20 de noviembre de 2026")).toHaveAttribute(
      "data-range",
      "start",
    );
    expect(day("jueves, 19 de noviembre de 2026")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await user.click(
      within(calendar()).getByRole("button", { name: "Mes siguiente" }),
    );
    await user.click(day("domingo, 6 de diciembre de 2026"));
    expect(field).toHaveValue("06/12/2026");

    await user.click(field);
    expect(day("domingo, 6 de diciembre de 2026")).toHaveAttribute(
      "data-range",
      "end",
    );
    await user.click(
      within(calendar()).getByRole("button", { name: "Mes anterior" }),
    );
    expect(day("miércoles, 25 de noviembre de 2026")).toHaveAttribute(
      "data-range",
      "inside",
    );
  });

  it("writes today with «Hoy», empties the field with «Borrar», and closes with Escape", async () => {
    const { user, field } = setup({ initial: "2026-11-20" });

    await user.click(field);
    await user.click(within(calendar()).getByRole("button", { name: "Hoy" }));
    expect(field).toHaveValue(formatCivilDate(boliviaToday()));

    await user.click(field);
    await user.click(
      within(calendar()).getByRole("button", { name: "Borrar" }),
    );
    expect(field).toHaveValue("");

    await user.click(field);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Calendario" }),
    ).not.toBeInTheDocument();
    expect(field).toHaveFocus();
  });

  it("moves between days with the arrows and picks one with Enter", async () => {
    const { user, field } = setup({ initial: "2026-11-20" });

    await user.click(
      screen.getByRole("button", { name: "Elegir en el calendario" }),
    );
    expect(day("viernes, 20 de noviembre de 2026")).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(day("viernes, 27 de noviembre de 2026")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(calendar()).getByText("Diciembre 2026")).toBeVisible();
    expect(day("viernes, 4 de diciembre de 2026")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(field).toHaveValue("04/12/2026");
  });
});
