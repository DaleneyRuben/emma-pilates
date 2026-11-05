import { readFileSync } from "node:fs";
import { join } from "node:path";
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
      "text-celda",
    );
  });

  // Walkthrough 2026-11-04 n.º 1: the rail's `text-pie` was dropped as a
  // color, so «Promociones» drew at 15 px and overflowed the 96 px rail.
  it("keeps every font size index.css defines next to a text color", () => {
    const css = readFileSync(join(__dirname, "../index.css"), "utf8");
    const sizes = [...css.matchAll(/--text-([a-z0-9-]+):/g)]
      .map((match) => match[1] ?? "")
      .filter((name) => !name.includes("--"));
    expect(sizes).toContain("pie");
    for (const size of sizes) {
      expect(cn(`text-${size} text-texto`)).toBe(`text-${size} text-texto`);
    }
  });

  it("still lets a later font size replace an earlier one", () => {
    expect(cn("text-cuerpo", "text-nota")).toBe("text-nota");
  });
});
