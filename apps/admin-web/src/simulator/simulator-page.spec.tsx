import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  paolaProfile,
  signedInHandlers,
  staffProfilePath,
} from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Simulador" });

const fill = async (
  user: ReturnType<typeof renderAdmin>["user"],
  name: string,
  value: string,
) => {
  const field = screen.getByRole("textbox", { name });
  await user.clear(field);
  await user.type(field, value);
};

describe("Simulador on a desktop browser", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("shows the owner's check and its derivation, and nothing is saved", async () => {
    const { user } = renderAdmin("/simulador");
    expect(await heading()).toBeVisible();
    expect(screen.getByText(/Nada se guarda/)).toBeVisible();

    await fill(user, "Clases por semana", "33");
    await fill(user, "Alumnas por clase", "4");
    await fill(user, "Precio por clase para la clienta (Bs)", "70");
    await fill(user, "Pago por clase a la instructora (Bs)", "65");
    await fill(user, "Alumnas incluidas en el pago", "4");
    await fill(user, "Pago por alumna extra (Bs)", "8");
    await fill(user, "Costos fijos (Bs)", "21175");
    await fill(user, "Impuestos (%)", "16");

    // 143 classes × 4 × Bs 70 = Bs 40.040; tax Bs 6.406,40; Trainer pay
    // 143 × Bs 65 = Bs 9.295.
    const result = screen.getByRole("region", { name: "Resultado" });
    expect(within(result).getByText("Bs 3.163,60")).toBeVisible();
    expect(within(result).getByText(/143 clases/)).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Punto de equilibrio" }),
      ).getByText("Bs 36.273,81"),
    ).toBeVisible();
    expect(screen.getByText("(21175 + 9295) / 0.84 = 36273.81")).toBeVisible();

    const projection = screen.getByRole("region", { name: "Proyección" });
    expect(within(projection).getByRole("table")).toBeVisible();
    const base = within(projection).getByRole("row", { name: /3 meses Base/ });
    expect(within(base).getByText("Bs 120.120,00")).toBeVisible();
    expect(within(base).getByText("Bs 9.490,80")).toBeVisible();
    expect(
      within(projection).getByRole("row", { name: /12 meses Alto/ }),
    ).toBeVisible();
    expect(
      within(projection).getByRole("row", { name: /6 meses Bajo/ }),
    ).toBeVisible();
  });

  it("moves the break-even up when the tax rate rises", async () => {
    const { user } = renderAdmin("/simulador");
    await heading();
    await fill(user, "Clases por semana", "33");
    await fill(user, "Pago por clase a la instructora (Bs)", "65");
    await fill(user, "Costos fijos (Bs)", "21175");

    await fill(user, "Impuestos (%)", "20");

    expect(
      within(
        screen.getByRole("region", { name: "Punto de equilibrio" }),
      ).getByText("Bs 38.087,50"),
    ).toBeVisible();
    const base = within(
      screen.getByRole("region", { name: "Proyección" }),
    ).getByRole("row", { name: /3 meses Base/ });
    expect(within(base).getByText("Bs 4.686,00")).toBeVisible();
  });

  // FIX-008 (review 2026-10-28): the Client price and Trainer pay were one
  // number, and the Bs 8 per student from the fifth was ignored.
  it("pays the Trainer Bs 8 for each student from the fifth", async () => {
    const { user } = renderAdmin("/simulador");
    await heading();

    await fill(user, "Alumnas por clase", "6");

    // Trainer pay is 143 × (Bs 65 + 2 × Bs 8) = Bs 11.583.
    expect(screen.getByText("(21175 + 11583) / 0.84 = 38997.62")).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Resultado" })).getByText(
        "Bs 17.692,40",
      ),
    ).toBeVisible();
  });

  it("hides the page from a role that is not the Administrator", async () => {
    server.use(
      http.get(apiUrl(staffProfilePath), () =>
        jsonResponse({ ...paolaProfile, role: "assistant" }),
      ),
    );
    renderAdmin("/simulador");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Clases por semana" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Proyección" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Simulador" }),
    ).not.toBeInTheDocument();
  });
});

describe("Simulador on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the figures readable and the sidebar behind the menu", async () => {
    renderAdmin("/simulador");
    expect(await heading()).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Punto de equilibrio" }),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Proyección" })).toBeVisible();
    expect(screen.getByRole("row", { name: /12 meses Alto/ })).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  });
});
