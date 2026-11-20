import { render, screen } from "@testing-library/react";
import { Table, TableBody, TableCell, TableRow } from "./table";

// FIX-089 (ListaC, owner 2026-11-19), Rosa Emma (rw.py listcard): at phone
// width a list is one white card with divider rows, not a card per row.
describe("a table at phone width", () => {
  it("keeps the block's frame and divides the rows instead of carding them", () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="row">
            <TableCell>Carla Prueba</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const frame = screen.getByRole("table").parentElement as HTMLElement;
    expect(frame.className).not.toMatch(
      /max-md:border-0|max-md:bg-transparent/,
    );
    const row = screen.getByTestId("row");
    expect(row.className).not.toMatch(
      /max-md:rounded-tarjeta|max-md:border-borde-fuerte|max-md:bg-blanco/,
    );
    expect(row.className).toMatch(/(^| )first:border-t-0/);
    expect(row.parentElement?.className).not.toMatch(/max-md:gap-2/);
  });
});
