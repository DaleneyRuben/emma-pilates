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
    await fill(user, "Precio por clase (Bs)", "65");
    await fill(user, "Costos fijos (Bs)", "21175");
    await fill(user, "Impuestos (%)", "16");

    const result = screen.getByRole("region", { name: "Resultado" });
    expect(within(result).getByText("Bs 761,20")).toBeVisible();
    expect(within(result).getByText(/143 clases/)).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Punto de equilibrio" }),
      ).getByText("Bs 36.273,81"),
    ).toBeVisible();
    expect(screen.getByText("(21175 + 9295) / 0.84 = 36273.81")).toBeVisible();
  });

  it("moves the break-even up when the tax rate rises", async () => {
    const { user } = renderAdmin("/simulador");
    await heading();
    await fill(user, "Clases por semana", "33");
    await fill(user, "Precio por clase (Bs)", "65");
    await fill(user, "Costos fijos (Bs)", "21175");

    await fill(user, "Impuestos (%)", "20");

    expect(
      within(
        screen.getByRole("region", { name: "Punto de equilibrio" }),
      ).getByText("Bs 38.087,50"),
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
    expect(
      screen.queryByRole("navigation", { name: "Secciones" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  });
});
