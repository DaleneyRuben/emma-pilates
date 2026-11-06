import { render, screen } from "@testing-library/react";
import { expectBrandedLoading } from "../../test/branded-loading";
import { PagePendingState } from "./page-pending-state";
import { LoadingNotice } from "./query-failure";

// WEB-045, follow-ups 94 and 107: every area that loads shows the one
// branded state, the studio's logo alone, centred in the area it replaces.
describe("the branded loading state (WEB-045)", () => {
  it("draws an in-page read as the logo, named with the page's label", () => {
    render(<LoadingNotice>Cargando el horario…</LoadingNotice>);

    const status = expectBrandedLoading("Cargando el horario…");
    expect(status.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("waits 400 ms before an in-page read's logo fades in, as follow-up 94 asks", () => {
    render(<LoadingNotice>Cargando el horario…</LoadingNotice>);

    expect(
      screen.getByRole("status").querySelector("img.carga-logo"),
    ).toHaveClass("carga-logo-demora");
  });

  it("does not add its own wait to the router's page switch, which already waits 400 ms", () => {
    render(<PagePendingState />);

    const status = expectBrandedLoading("Cargando la página");
    expect(status.querySelector("img")).not.toHaveClass("carga-logo-demora");
  });

  it("grows into the space it replaces, so the logo is centred in it", () => {
    render(<LoadingNotice>Cargando el horario…</LoadingNotice>);

    expect(screen.getByRole("status")).toHaveClass(
      "carga-area",
      "flex-1",
      "items-center",
      "justify-center",
    );
  });

  it("shows one logo when two areas load at once, then the next one's", () => {
    const { rerender } = render(
      <>
        <LoadingNotice>Cargando el ingreso devengado…</LoadingNotice>
        <LoadingNotice>Cargando el reporte…</LoadingNotice>
      </>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expectBrandedLoading("Cargando el ingreso devengado…");

    rerender(
      <>
        {null}
        <LoadingNotice>Cargando el reporte…</LoadingNotice>
      </>,
    );
    expectBrandedLoading("Cargando el reporte…");
  });
});
