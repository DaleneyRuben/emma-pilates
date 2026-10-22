import { act, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { delay, http } from "msw";
import { apiUrl, problemResponse, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import {
  currentSessionPath,
  paolaPrincipal,
  signedInHandlers,
  signedOutHandlers,
} from "../test/session-handlers";
import { startupStateId } from "./startup-state";

// WEB-035, design follow-up 106: index.html draws the logo on Crema before
// any script runs, and the page keeps it until the router has drawn the
// first page, so the browser never shows a blank page or a blink between
// the static logo and React's own.
const indexHtml = readFileSync(
  join(__dirname, "..", "..", "index.html"),
  "utf8",
);

const startupState = () => document.getElementById(startupStateId);

const heading = (name: string) =>
  screen.findByRole("heading", { level: 1, name });

describe("the first-load state in index.html", () => {
  it("is a status with the logo, outside the React root, before the bundle", () => {
    expect(indexHtml).toContain(`id="${startupStateId}"`);
    expect(indexHtml).toMatch(/role="status"/);
    expect(indexHtml).toMatch(/aria-label="Cargando la administración"/);
    expect(indexHtml).toMatch(/<img[^>]*src="\/emma-logo\.png"[^>]*alt=""/);
    expect(indexHtml.indexOf(`id="${startupStateId}"`)).toBeLessThan(
      indexHtml.indexOf('id="root"'),
    );
    expect(indexHtml).toMatch(
      /<link rel="stylesheet" href="\/src\/carga\.css"/,
    );
  });

  // WEB-030: the policy allows no inline style or script.
  it("keeps the Content-Security-Policy intact: no inline styles or scripts", () => {
    expect(indexHtml).not.toMatch(/<style/);
    expect(indexHtml).not.toMatch(/ style="/);
    expect(indexHtml).not.toMatch(/<script(?![^>]*src=)/);
    expect(indexHtml).not.toMatch(/\son[a-z]+="/);
  });
});

describe("the first-load state while the app starts", () => {
  useMockServer();

  beforeEach(() => {
    const element = document.createElement("div");
    element.id = startupStateId;
    element.setAttribute("role", "status");
    document.body.appendChild(element);
  });
  afterEach(() => startupState()?.remove());

  it("stays while the session probe runs and leaves once the first page is drawn", async () => {
    server.use(...signedInHandlers(), ...emptyPageHandlers());
    server.use(
      http.get(apiUrl(currentSessionPath), async () => {
        await delay(300);
        return Response.json(paolaPrincipal);
      }),
    );
    renderAdmin("/back-office/gastos");

    // The probe answers outside any Testing Library call, so the test holds
    // the act scope while it waits.
    await act(() => delay(150));
    expect(startupState()).toBeInTheDocument();

    await heading("Gastos");
    await waitFor(() => expect(startupState()).not.toBeInTheDocument());
  });

  it("leaves once a signed-out visitor is on Login", async () => {
    server.use(...signedOutHandlers());
    renderAdmin("/");

    await heading("Iniciar sesión");
    await waitFor(() => expect(startupState()).not.toBeInTheDocument());
  });

  it("leaves once the startup error page says the server could not be reached", async () => {
    server.use(
      http.get(apiUrl(currentSessionPath), () =>
        problemResponse(503, "service_unavailable"),
      ),
    );
    renderAdmin("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos conectar con el servidor",
    );
    await waitFor(() => expect(startupState()).not.toBeInTheDocument());
  });
});
