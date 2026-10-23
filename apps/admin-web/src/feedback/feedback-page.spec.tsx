import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  feedbackPage,
  feedbackPath,
  problem,
  suggestion,
} from "../test/feedback-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const reads: URLSearchParams[] = [];
const feedbackList = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(feedbackPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Comentarios" });

const rowOf = async (text: RegExp) =>
  (await screen.findByRole("cell", { name: text }))
    .parentElement as HTMLElement;

// jsdom's Blob has no text().
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

describe("AW38 Comentarios (REL-012)", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the feedback with its type, app, version, and status", async () => {
    server.use(
      feedbackList(() => jsonResponse(feedbackPage([problem, suggestion]))),
    );
    renderAdmin("/comentarios");
    await heading();

    const row = await rowOf(/No puedo ver mis reservas/);
    expect(within(row).getByText("Problema")).toBeInTheDocument();
    expect(within(row).getByText("App de clientas")).toBeInTheDocument();
    expect(within(row).getByText("1.0.1 (3) · Android 14")).toBeInTheDocument();
    expect(within(row).getByText("22/10/2026 · 20:30")).toBeInTheDocument();
    expect(within(row).getByText("Nuevo")).toBeInTheDocument();
    const resolved = await rowOf(/Sería útil/);
    expect(within(resolved).getByText("Resuelto")).toBeInTheDocument();
    expect(within(resolved).getByText("App del personal")).toBeInTheDocument();
    expect(
      screen.getByText("Desde las dos apps · 1 comentario nuevo"),
    ).toBeVisible();
    expect(
      within(screen.getByRole("navigation", { name: "Secciones" })).getByRole(
        "link",
        { name: "Comentarios" },
      ),
    ).toHaveAttribute("aria-current", "page");
  });

  it("filters by status and app", async () => {
    server.use(feedbackList(() => jsonResponse(feedbackPage([problem]))));
    const { user } = renderAdmin("/comentarios");
    await rowOf(/No puedo ver mis reservas/);

    await user.selectOptions(screen.getByLabelText("Estado"), "Nuevo");
    await user.selectOptions(screen.getByLabelText("App"), "App del personal");

    await waitFor(() => {
      const last = reads.at(-1);
      expect(last?.get("status")).toBe("new");
      expect(last?.get("app")).toBe("staff");
    });
    expect(reads[0]?.has("status")).toBe(false);
    expect(reads[0]?.has("app")).toBe(false);
  });

  it("says so when there is no feedback yet", async () => {
    server.use(feedbackList(() => jsonResponse(feedbackPage([]))));
    renderAdmin("/comentarios");

    expect(
      await screen.findByText("Todavía no hay comentarios."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });

  it("opens the detail and resolves it with «Qué cambiamos»", async () => {
    let triage: unknown;
    let resolved = false;
    server.use(
      feedbackList(() =>
        jsonResponse(
          feedbackPage([
            resolved ? { ...problem, status: "resolved" } : problem,
          ]),
        ),
      ),
      http.post(
        apiUrl(`${feedbackPath}/:feedbackId/triage`),
        async ({ request }) => {
          triage = await request.json();
          resolved = true;
          return jsonResponse({
            ...problem,
            status: "resolved",
            changeNote: "Arreglamos la lista.",
          });
        },
      ),
    );
    const { user } = renderAdmin("/comentarios");

    await user.click(
      await screen.findByRole("button", { name: /No puedo ver mis reservas/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Comentario" });
    expect(
      within(panel).getByText(
        "No puedo ver mis reservas de mañana en la lista.",
      ),
    ).toBeInTheDocument();
    expect(within(panel).getByText("valeria@example.com")).toBeInTheDocument();
    expect(within(panel).getByText("Clienta")).toBeInTheDocument();
    expect(within(panel).getByText("Android 14")).toBeInTheDocument();
    expect(within(panel).getByText("1.0.1 (3)")).toBeInTheDocument();

    await user.click(within(panel).getByLabelText("Resuelto"));
    await user.type(
      within(panel).getByLabelText("Qué cambiamos"),
      "Arreglamos la lista.",
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Guardamos el comentario.")).toBeVisible();
    expect(triage).toEqual({
      status: "resolved",
      changeNote: "Arreglamos la lista.",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the panel open when saving fails", async () => {
    server.use(
      feedbackList(() => jsonResponse(feedbackPage([problem]))),
      http.post(apiUrl(`${feedbackPath}/:feedbackId/triage`), () =>
        problemResponse(500, "internal_error"),
      ),
    );
    const { user } = renderAdmin("/comentarios");

    await user.click(
      await screen.findByRole("button", { name: /No puedo ver mis reservas/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Comentario" });
    await user.click(within(panel).getByLabelText("Revisado"));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeVisible();
  });

  describe("exporting", () => {
    let saved: { name: string; blob: Blob } | undefined;
    let createObjectURL: typeof URL.createObjectURL;
    let click: jest.SpyInstance;

    beforeEach(() => {
      saved = undefined;
      createObjectURL = URL.createObjectURL;
      let blob: Blob | undefined;
      URL.createObjectURL = (value: Blob | MediaSource) => {
        blob = value as Blob;
        return "blob:test/feedback";
      };
      click = jest
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          if (blob !== undefined) saved = { name: this.download, blob };
        });
    });

    afterEach(() => {
      URL.createObjectURL = createObjectURL;
      click.mockRestore();
    });

    it("downloads every comment with date, type, text, version, and note", async () => {
      server.use(
        feedbackList(() => jsonResponse(feedbackPage([problem], 2))),
        http.get(apiUrl(`${feedbackPath}/export`), () =>
          jsonResponse({ items: [problem, suggestion] }),
        ),
      );
      const { user } = renderAdmin("/comentarios");
      await rowOf(/No puedo ver mis reservas/);

      await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

      await waitFor(() => expect(saved).toBeDefined());
      expect(saved?.name).toMatch(/^comentarios-\d{4}-\d{2}-\d{2}\.csv$/);
      const text = saved === undefined ? "" : await readBlob(saved.blob);
      expect(text.split("\r\n")).toEqual([
        "\uFEFFFecha,App,Tipo,Comentario,Versión,Estado,Qué cambiamos",
        "22/10/2026 · 20:30,App de clientas,Problema,No puedo ver mis reservas de mañana en la lista.,1.0.1 (3) · Android 14,Nuevo,",
        '21/10/2026 · 10:00,App del personal,Sugerencia,"Sería útil ver la lista de la clase siguiente, con comas, y «comillas».",1.0.1 (4) · iOS 18.2,Resuelto,Agregamos la próxima clase en Mi agenda (1.0.2).',
        "",
      ]);
    });
  });
});
