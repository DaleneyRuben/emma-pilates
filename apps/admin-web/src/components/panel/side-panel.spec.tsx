import { fireEvent, render, screen } from "@testing-library/react";
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

  // WEB-036: a viewer opened over the panel (AW29's enlarged receipt) is a
  // dialog of its own, portaled outside the panel. Radix hands Escape to the
  // highest layer, but a layer becomes the highest only in an effect after
  // it is painted and focused, so an Escape pressed inside the viewer in
  // that window reaches the panel instead and closes both.
  it("ignores an Escape pressed inside another dialog layered over it", () => {
    const onOpenChange = jest.fn();
    render(
      <SidePanel open onOpenChange={onOpenChange} title="Revisar pago">
        <p>Formulario</p>
      </SidePanel>,
    );
    const viewer = document.body.appendChild(document.createElement("div"));
    viewer.setAttribute("role", "dialog");
    const close = viewer.appendChild(document.createElement("button"));

    fireEvent.keyDown(close, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole("button", { name: "Cerrar" }), {
      key: "Escape",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    viewer.remove();
  });

  // UX-018: opening a create panel lands on its first field. Radix otherwise
  // focuses the dialog content, whose first tab stop is «Cerrar».
  it("moves focus to the first field when the panel opens", () => {
    render(
      <SidePanel open onOpenChange={() => undefined} title="Nueva sesión">
        <input aria-label="Tipo de clase" />
      </SidePanel>,
    );

    expect(
      screen.getByRole("textbox", { name: "Tipo de clase" }),
    ).toHaveFocus();
  });

  // A read-only panel such as Detalle de cliente has no field. Focus lands
  // on the heading, and «Cerrar» stays the named close control.
  it("moves focus to the heading when the panel has no field", () => {
    render(
      <SidePanel open onOpenChange={() => undefined} title="Lucía Fernández">
        <p>Resumen</p>
      </SidePanel>,
    );

    expect(
      screen.getByRole("heading", { name: "Lucía Fernández" }),
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });
});
