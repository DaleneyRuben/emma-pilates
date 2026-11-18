import { render, screen } from "@testing-library/react";
import { createColumnHelper } from "@tanstack/react-table";
import { compactCard } from "../../test/compact-card";
import { useNarrowViewport } from "../../test/viewport";
import { DataTable } from "./data-table";

type Row = { id: string; name: string; plan: string; total: string };
const columns = createColumnHelper<Row>();

// FIX-088: a row's phone card, from the columns' defaults and metadata.
describe("the compact phone card", () => {
  useNarrowViewport();

  it("puts the first column first, Estado on the right, joins the rest, and labels when asked", () => {
    render(
      <DataTable
        rowId={(row) => row.id}
        rows={[{ id: "1", name: "Lucía", plan: "8 clases", total: "Bs 10" }]}
        columns={[
          columns.accessor("name", { header: "Nombre" }),
          columns.display({
            id: "plan",
            header: "Plan",
            cell: () => (
              <span className="flex flex-col">
                <span>8 clases</span>
                <span>Empieza el 03/11/2026</span>
              </span>
            ),
          }),
          columns.accessor("total", {
            header: "Diferencia",
            meta: { cardLabel: "Dif." },
          }),
          columns.display({ id: "empty", header: "Nota", cell: () => null }),
          columns.display({
            id: "state",
            header: "Estado",
            cell: () => "Activo",
          }),
        ]}
      />,
    );
    const row = screen.getByText("Lucía").closest("tr")!;
    expect(compactCard(row)).toMatchObject({
      compact: true,
      title: "Lucía",
      status: "Activo",
      labels: 0,
    });
    const detail = row.querySelector('[data-part="detail"]')!;
    // Inner lines of a cell get their own separator element; a label leads
    // its figure; an empty cell adds nothing.
    expect(detail.textContent).toBe("8 clasesEmpieza el 03/11/2026Dif. Bs 10");
    expect(detail.querySelectorAll(":scope > span")).toHaveLength(3);
    expect(detail.querySelector("[data-card-label]")).toHaveTextContent("Dif.");
  });
});
