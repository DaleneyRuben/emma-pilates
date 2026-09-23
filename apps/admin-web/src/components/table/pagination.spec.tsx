import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { listSearchSchema, pageCount, pageRangeLabel } from "./pagination";
import { TablePagination } from "./table-pagination";

describe("listSearchSchema", () => {
  it("defaults to the first page of twenty rows", () => {
    expect(listSearchSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces the URL strings and falls back when they are unusable", () => {
    expect(listSearchSchema.parse({ page: "3", pageSize: "50" })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(listSearchSchema.parse({ page: "abc", pageSize: "500" })).toEqual({
      page: 1,
      pageSize: 20,
    });
    expect(listSearchSchema.parse({ page: 0, pageSize: 2.5 })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});

describe("page arithmetic", () => {
  it("counts pages with at least one page for an empty collection", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
    expect(pageCount(57, 20)).toBe(3);
  });

  it("labels the visible range in Spanish", () => {
    expect(pageRangeLabel({ page: 1, pageSize: 20, totalItems: 57 })).toBe(
      "Mostrando 1–20 de 57",
    );
    expect(pageRangeLabel({ page: 3, pageSize: 20, totalItems: 57 })).toBe(
      "Mostrando 41–57 de 57",
    );
    expect(pageRangeLabel({ page: 1, pageSize: 20, totalItems: 0 })).toBe(
      "Sin resultados",
    );
  });
});

describe("TablePagination", () => {
  it("disables the edges and reports the page that was asked for", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TablePagination
        page={1}
        pageSize={20}
        totalItems={57}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Mostrando 1–20 de 57")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <TablePagination
        page={3}
        pageSize={20}
        totalItems={57}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });
});

type Row = { name: string; address: string };
const columns = createColumnHelper<Row>();
const rowColumns = [
  columns.accessor("name", { header: "Nombre" }),
  columns.accessor("address", { header: "Dirección" }),
];

describe("DataTable", () => {
  it("renders the page rows with their column names for the narrow reflow and wires the pagination", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={rowColumns}
        rows={[
          { name: "Centro", address: "Calle Ayacucho 245" },
          { name: "Urubó", address: "Condominio Los Tajibos" },
        ]}
        rowId={(row) => row.name}
        pagination={{
          page: 2,
          pageSize: 2,
          totalItems: 5,
          onPageChange,
        }}
      />,
    );

    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["Nombre", "Dirección"]);
    const address = screen.getByRole("cell", {
      name: "Condominio Los Tajibos",
    });
    expect(address).toHaveAttribute("data-label", "Dirección");
    expect(screen.getByText("Mostrando 3–4 de 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("shows the empty message instead of an empty table body", () => {
    render(
      <DataTable
        columns={rowColumns}
        rows={[]}
        rowId={(row) => row.name}
        emptyMessage="No hay sucursales."
        pagination={{
          page: 1,
          pageSize: 20,
          totalItems: 0,
          onPageChange: jest.fn(),
        }}
      />,
    );

    expect(screen.getByText("No hay sucursales.")).toBeInTheDocument();
    expect(screen.queryByRole("cell")).not.toBeInTheDocument();
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });
});
