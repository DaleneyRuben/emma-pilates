import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/button";
import { typeScale } from "../components/ui/typography";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a tipo class and a text colour side by side", () => {
    expect(cn("tipo-titulo-seccion text-texto")).toBe(
      "tipo-titulo-seccion text-texto",
    );
  });

  it("keeps the white label on the primary button at every size", () => {
    render(
      <>
        <Button size="lg">Grande</Button>
        <Button size="sm">Chico</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Grande" })).toHaveClass(
      "text-sobre-primario",
      "tipo-boton",
    );
    expect(screen.getByRole("button", { name: "Chico" })).toHaveClass(
      "text-sobre-primario",
      "tipo-boton-chico",
    );
  });

  // Walkthrough 2026-11-04 n.º 1: a size read as a colour was dropped, so
  // «Promociones» drew at 15 px and overflowed the 96 px rail.
  it("keeps every size of the scale next to a text colour", () => {
    for (const size of Object.keys(typeScale)) {
      expect(cn(`text-${size} text-texto`)).toBe(`text-${size} text-texto`);
    }
  });

  it("lets a later tipo class replace an earlier one", () => {
    expect(cn("tipo-titulo-fila h-10", "tipo-compacto h-9")).toBe(
      "tipo-compacto h-9",
    );
  });
});
