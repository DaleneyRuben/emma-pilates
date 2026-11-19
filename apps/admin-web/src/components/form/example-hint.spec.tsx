import { render, screen } from "@testing-library/react";
import { ExampleHint } from "./example-hint";

describe("ExampleHint (FIX-089, FormB)", () => {
  it("writes the example as «Ej.: …»", () => {
    render(
      <p>
        <ExampleHint example="Equipetrol" />
      </p>,
    );

    expect(screen.getByText("Ej.: Equipetrol")).toBeInTheDocument();
  });

  it("keeps the field's own help on its own line under the example", () => {
    render(
      <p>
        <ExampleHint example="8">Cantidad fija.</ExampleHint>
      </p>,
    );

    expect(screen.getByText("Ej.: 8")).toBeInTheDocument();
    expect(screen.getByText("Cantidad fija.")).toHaveClass("block");
  });
});
