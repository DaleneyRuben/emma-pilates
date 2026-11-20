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

  // FIX-089 (ListaC): a person list's phone row.
  it("leads a person row with her circle and ends an opening row with a chevron", () => {
    const open = jest.fn();
    render(
      <DataTable
        rowId={(row) => row.id}
        rows={[{ id: "1", name: "Lucía", plan: "8 clases", total: "Bs 10" }]}
        avatar={(row) => <span data-testid="circle">{row.name[0]}</span>}
        onRowClick={open}
        columns={[
          columns.accessor("name", {
            header: "Nombre",
            cell: ({ getValue }) => (
              <span>
                <span data-photo="">L</span>
                {getValue()}
              </span>
            ),
          }),
          columns.accessor("plan", { header: "Plan" }),
        ]}
      />,
    );
    const row = screen.getByText("Lucía").closest("tr")!;

    expect(row.querySelector('[data-part="avatar"]')).toContainElement(
      screen.getByTestId("circle"),
    );
    expect(row.querySelector('[data-part="title"]')).toHaveClass(
      "text-[16px]",
      "font-semibold",
      "[&_[data-photo]]:hidden",
    );
    expect(row.querySelector('[data-part="chevron"]')).toBeInTheDocument();
    expect(row.querySelector('[data-part="detail"]')).toHaveClass(
      "text-nota",
      "truncate",
    );
  });

  it("keeps a row that opens nothing without circle or chevron", () => {
    render(
      <DataTable
        rowId={(row) => row.id}
        rows={[{ id: "1", name: "Papel", plan: "4 unid.", total: "" }]}
        columns={[
          columns.accessor("name", { header: "Nombre" }),
          columns.accessor("plan", { header: "Stock" }),
        ]}
      />,
    );
    const row = screen.getByText("Papel").closest("tr")!;

    expect(row.querySelector('[data-part="avatar"]')).toBeNull();
    expect(row.querySelector('[data-part="chevron"]')).toBeNull();
  });
});
