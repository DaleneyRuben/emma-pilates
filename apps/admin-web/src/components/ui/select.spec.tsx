import { render, screen } from "@testing-library/react";
import { Select } from "./select";

describe("Select", () => {
  it("hides the browser's arrow and draws the palette's chevron instead", () => {
    render(
      <Select aria-label="Estado" defaultValue="active">
        <option value="active">Activas</option>
        <option value="archived">Archivadas</option>
      </Select>,
    );

    // The native arrow is painted by the browser in black, outside the
    // closed palette; the `select-chevron` utility (index.css) replaces it.
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveClass(
      "select-chevron",
    );
  });
});
