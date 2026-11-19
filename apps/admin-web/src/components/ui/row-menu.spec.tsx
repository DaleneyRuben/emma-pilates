import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RowMenu } from "./row-menu";

describe("RowMenu (FIX-091)", () => {
  it("opens the row's actions from ⋯ and runs the chosen one", async () => {
    const user = userEvent.setup();
    const onVoid = jest.fn();
    render(
      <RowMenu
        label="Acciones de Lucía Fernández"
        items={[{ label: "Anular venta", onSelect: onVoid }]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Acciones de Lucía Fernández" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Anular venta" }));

    expect(onVoid).toHaveBeenCalledTimes(1);
  });

  it("draws nothing when the row has no action", () => {
    const { container } = render(<RowMenu label="Acciones" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
