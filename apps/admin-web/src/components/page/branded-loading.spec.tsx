import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expectBrandedLoading } from "../../test/branded-loading";
import { PagePendingState } from "./page-pending-state";
import { LoadingNotice } from "./query-failure";

const cargaCss = readFileSync(join(__dirname, "..", "..", "carga.css"), "utf8");

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

    expect(screen.getByRole("status").querySelector(".carga-halo")).toHaveClass(
      "carga-halo-demora",
    );
  });

  it("does not add its own wait to the router's page switch, which already waits 400 ms", () => {
    render(<PagePendingState />);

    const status = expectBrandedLoading("Cargando la página");
    expect(status.querySelector(".carga-halo")).not.toHaveClass(
      "carga-halo-demora",
    );
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

  // Follow-up 286 (Rosa Emma, option A): the halo is a Rosa 50 glow with no
  // edge, and it breathes with the logo as one piece; the logo itself holds
  // still inside it. The rules live in carga.css, which jsdom does not apply.
  it("breathes the logo and its soft Rosa 50 halo together", () => {
    const rule = (selector: string) =>
      cargaCss.match(
        new RegExp(`\\n${selector.replace(".", "\\.")} \\{([^}]*)\\}`),
      )?.[1] ?? "";

    expect(rule(".carga-halo")).toMatch(
      /radial-gradient\(\s*circle,\s*#fef6f2 0%,\s*#fef6f2 45%,\s*rgb\(254 246 242 \/ 0%\) 70%\s*\)/,
    );
    expect(rule(".carga-halo")).toMatch(/border-radius: 50%/);
    expect(rule(".carga-halo")).toMatch(/carga-respira 1\.4s/);
    expect(rule(".carga-logo")).not.toMatch(/animation/);
  });
});
