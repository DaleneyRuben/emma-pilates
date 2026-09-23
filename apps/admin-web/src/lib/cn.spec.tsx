import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/button";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps an Emma font size and a text color side by side", () => {
    expect(cn("font-serif text-titulo-panel text-texto")).toBe(
      "font-serif text-titulo-panel text-texto",
    );
  });

  it("keeps white text on the primary button at every size", () => {
    render(
      <>
        <Button size="lg">Grande</Button>
        <Button size="sm">Chico</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Grande" })).toHaveClass(
      "text-blanco",
      "text-cuerpo",
    );
    expect(screen.getByRole("button", { name: "Chico" })).toHaveClass(
      "text-blanco",
      "text-nota",
    );
  });

  it("still lets a later font size replace an earlier one", () => {
    expect(cn("text-cuerpo", "text-nota")).toBe("text-nota");
  });
});
