import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChips } from "./filter-chips";

describe("FilterChips (FIX-091)", () => {
  const options = [
    { value: undefined, label: "Todos" },
    { value: "new", label: "Sin leer", count: 19 },
  ] as const;

  it("marks the chosen chip pressed and shows each count after a dot", () => {
    render(
      <FilterChips
        label="Filtrar comentarios"
        value="new"
        options={options}
        onChange={() => {}}
      />,
    );

    const group = screen.getByRole("group", { name: "Filtrar comentarios" });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sin leer · 19" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the chosen value, undefined for the catch-all chip", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <FilterChips
        label="Filtrar comentarios"
        value="new"
        options={options}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Todos" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
