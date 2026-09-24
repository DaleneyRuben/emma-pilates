import { render, screen } from "@testing-library/react";
import { SidePanel } from "./side-panel";

describe("SidePanel", () => {
  it("closes with the handoff's bordered 30 px square, the one the receipt viewer draws", () => {
    render(
      <SidePanel open onOpenChange={() => undefined} title="Nueva sucursal">
        <p>Formulario</p>
      </SidePanel>,
    );

    // design/README.md, side-panel header: 30px square close button, 1px
    // Borde, Superficie fill, hover border in Palo de rosa (follow-up 21).
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveClass(
      "size-[30px]",
      "border",
      "border-borde",
      "bg-superficie",
      "hover:border-primario",
    );
  });
});
