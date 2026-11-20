import { render, screen } from "@testing-library/react";
import { StatTile, StatTiles } from "./stat-tile";

describe("StatTile (FIX-091)", () => {
  it("names the figure as a labelled region with its line under it", () => {
    render(
      <StatTiles>
        <StatTile label="Sin leer" figure="19" line="Desde las dos apps" />
      </StatTiles>,
    );

    const tile = screen.getByRole("region", { name: "Sin leer" });
    expect(tile).toHaveTextContent("19");
    expect(tile).toHaveTextContent("Desde las dos apps");
  });

  it("draws the lead tile as the Palo de rosa block", () => {
    render(<StatTile label="Entró" figure="Bs 450" emphasis />);

    expect(screen.getByRole("region", { name: "Entró" })).toHaveClass(
      "bg-palo-de-rosa",
    );
  });
});
