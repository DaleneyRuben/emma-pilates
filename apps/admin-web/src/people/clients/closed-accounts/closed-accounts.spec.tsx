import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../../test/msw";
import {
  clientPage,
  clientRow,
  clientsPath,
} from "../../../test/people-fixtures";
import {
  contactPage,
  daniela,
  promotionContactsPath,
  valeria,
} from "../../../test/promotion-contact-fixtures";
import { renderAdmin } from "../../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../../test/session-handlers";

const contactReads: URLSearchParams[] = [];
const clientReads: URLSearchParams[] = [];
const contactList = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(promotionContactsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    contactReads.push(params);
    return respond(params);
  });
const clientTable = () =>
  http.get(apiUrl(clientsPath), ({ request }) => {
    clientReads.push(new URL(request.url).searchParams);
    return jsonResponse(clientPage([clientRow("Isabel Arce")]));
  });

// jsdom's Blob has no text().
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

const chip = (name: string) =>
  within(screen.getByRole("group", { name: "Filtrar clientas" })).getByRole(
    "button",
    { name },
  );

// FIX-065 (walkthrough finding 91, option A of follow-up 267): the former
// Clients who asked to keep hearing from the studio are Clientas' sixth
// chip, «Cuenta cerrada», instead of Promociones › Contactos.
describe("Clientas › Cuenta cerrada", () => {
  useMockServer();
  beforeEach(() => {
    contactReads.length = 0;
    clientReads.length = 0;
    server.use(...signedInHandlers(), clientTable());
  });

  it("lists only the closed accounts with when each asked for promotions", async () => {
    server.use(
      contactList(() => jsonResponse(contactPage([valeria, daniela]))),
    );
    renderAdmin("/clientas?filter=closed");

    const row = await rowOf("Valeria Quiroga");
    expect(contactReads.at(-1)?.get("kind")).toBe("former_client");
    expect(chip("Cuenta cerrada")).toHaveAttribute("aria-pressed", "true");
    expect(
      within(row).getByRole("cell", { name: /valeria@example.com/ }),
    ).toHaveAttribute("data-label", "Contacto");
    expect(within(row).getByText("🇧🇴 +591 70011005")).toBeInTheDocument();
    expect(
      within(row).getByRole("cell", { name: "19/10/2026" }),
    ).toHaveAttribute("data-label", "Recibe promociones desde");
    expect(
      within(row).getByRole("cell", { name: "Cuenta cerrada" }),
    ).toHaveAttribute("data-label", "Estado");
    expect(
      within(await rowOf("Daniela Rojas")).getByText("16/10/2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Exclientas que cerraron su cuenta y pidieron seguir recibiendo promociones. No tienen ficha.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 2 de 2 exclientas")).toBeVisible();
    // The studio's counts stay those of live Clients, never the closed chip.
    expect(
      await screen.findByText(
        "148 clientas · 96 con plan activo · 12 fundadoras",
      ),
    ).toBeVisible();
    expect(clientReads.every((params) => !params.has("filter"))).toBe(true);
  });

  it("sends the search with the kind and keeps it in the address", async () => {
    server.use(contactList(() => jsonResponse(contactPage([valeria]))));
    const { user, router } = renderAdmin("/clientas?filter=closed");
    await rowOf("Valeria Quiroga");

    await user.type(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
      "vale",
    );

    await waitFor(() => expect(contactReads.at(-1)?.get("q")).toBe("vale"));
    expect(contactReads.at(-1)?.get("kind")).toBe("former_client");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      filter: "closed",
      q: "vale",
    });
  });

  it("says when nobody closed an account asking for promotions", async () => {
    server.use(contactList(() => jsonResponse(contactPage([]))));
    renderAdmin("/clientas?filter=closed");

    expect(
      await screen.findByText(
        "Nadie cerró su cuenta pidiendo seguir recibiendo promociones.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });

  it("says nothing matched a search", async () => {
    server.use(contactList(() => jsonResponse(contactPage([], 0))));
    renderAdmin("/clientas?filter=closed&q=gutierrez");

    expect(
      await screen.findByText("No se encontró ninguna exclienta."),
    ).toBeInTheDocument();
  });

  it("erases a contact after confirming and says so", async () => {
    let withdrawn: string | undefined;
    let erased = false;
    server.use(
      contactList(() =>
        jsonResponse(contactPage(erased ? [daniela] : [valeria, daniela])),
      ),
      http.post(
        apiUrl(`${promotionContactsPath}/:contactId/withdrawal`),
        ({ params }) => {
          withdrawn = String(params.contactId);
          erased = true;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const { user } = renderAdmin("/clientas?filter=closed");
    const row = await rowOf("Valeria Quiroga");

    await user.click(
      within(row).getByRole("button", {
        name: "Dejar de enviar a Valeria Quiroga",
      }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Dejar de enviar promociones a Valeria Quiroga?",
    });
    expect(
      within(dialog).getByText(
        "Borramos su nombre, correo y teléfono de esta lista. Usa esto cuando la persona te pida que paremos.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Esta acción no se puede deshacer."),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Borrar contacto" }),
    );

    expect(
      await screen.findByText("Borramos el contacto de Valeria Quiroga."),
    ).toBeVisible();
    expect(withdrawn).toBe(valeria.id);
    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: /Valeria Quiroga/ }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open when erasing fails", async () => {
    server.use(
      contactList(() => jsonResponse(contactPage([valeria]))),
      http.post(apiUrl(`${promotionContactsPath}/:contactId/withdrawal`), () =>
        problemResponse(500, "internal_error"),
      ),
    );
    const { user } = renderAdmin("/clientas?filter=closed");
    const row = await rowOf("Valeria Quiroga");

    await user.click(
      within(row).getByRole("button", {
        name: "Dejar de enviar a Valeria Quiroga",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Borrar contacto" }),
    );

    expect(
      await within(dialog).findByText(
        "No pudimos borrar el contacto. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
  });

  it("gives the Coordinator the chip and «Dejar de enviar» too", async () => {
    server.use(
      ...coordinatorHandlers(),
      contactList(() => jsonResponse(contactPage([valeria]))),
    );
    renderAdmin("/clientas?filter=closed");

    expect(
      within(await rowOf("Valeria Quiroga")).getByRole("button", {
        name: "Dejar de enviar a Valeria Quiroga",
      }),
    ).toBeVisible();
  });

  it("opens the old Contactos address on the chip with its search", async () => {
    server.use(contactList(() => jsonResponse(contactPage([valeria]))));
    const { router } = renderAdmin("/promociones/contactos?q=vale");

    await rowOf("Valeria Quiroga");
    expect(router.state.location.pathname).toBe("/clientas");
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      filter: "closed",
      q: "vale",
    });
    expect(
      screen.queryByRole("link", { name: "Contactos" }),
    ).not.toBeInTheDocument();
  });
});

describe("Clientas › «Exportar CSV»", () => {
  useMockServer();
  let saved: { name: string; blob: Blob } | undefined;
  let createObjectURL: typeof URL.createObjectURL;
  let click: jest.SpyInstance;

  beforeEach(() => {
    contactReads.length = 0;
    server.use(...signedInHandlers(), clientTable());
    saved = undefined;
    createObjectURL = URL.createObjectURL;
    let blob: Blob | undefined;
    URL.createObjectURL = (value: Blob | MediaSource) => {
      blob = value as Blob;
      return "blob:test/clientas";
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

  it("downloads what the chip and search show and says so", async () => {
    let exported: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(`${clientsPath}/export`), ({ request }) => {
        exported = new URL(request.url).searchParams;
        return jsonResponse({
          items: [
            {
              id: "c1000000-0000-5000-8000-000000000001",
              name: "Isabel Arce",
              subscriptionStatus: "active",
              email: "isabel@example.com",
              phone: "+591 70011003",
              clientSince: "2026-09-02",
            },
          ],
        });
      }),
    );
    const { user } = renderAdmin("/clientas?filter=active&q=isa");
    await rowOf("Isabel Arce");

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() => expect(saved).toBeDefined());
    expect(exported?.get("filter")).toBe("active");
    expect(exported?.get("q")).toBe("isa");
    expect(saved?.name).toMatch(/^clientas-con-plan-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(saved?.blob.type).toBe("text/csv;charset=utf-8");
    const text = saved === undefined ? "" : await readBlob(saved.blob);
    expect(text).toContain(
      "Isabel Arce,Activo,isabel@example.com,+591 70011003,02/09/2026",
    );
    expect(
      await screen.findByText(
        new RegExp(
          "^Descargamos clientas-con-plan-\\d{4}-\\d{2}-\\d{2}\\.csv con 1 clienta\\.$",
        ),
      ),
    ).toBeVisible();
  });

  it("downloads the closed accounts with their search", async () => {
    let exported: URLSearchParams | undefined;
    server.use(
      contactList(() => jsonResponse(contactPage([valeria, daniela]))),
      http.get(apiUrl(`${promotionContactsPath}/export`), ({ request }) => {
        exported = new URL(request.url).searchParams;
        return jsonResponse({ items: [valeria, daniela] });
      }),
    );
    const { user } = renderAdmin("/clientas?filter=closed&q=a");
    await rowOf("Valeria Quiroga");

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() => expect(saved).toBeDefined());
    expect(exported?.get("kind")).toBe("former_client");
    expect(exported?.get("q")).toBe("a");
    expect(saved?.name).toMatch(
      /^clientas-cuenta-cerrada-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const text = saved === undefined ? "" : await readBlob(saved.blob);
    expect(text.split("\r\n")).toHaveLength(4);
    expect(await screen.findByText(/con 2 exclientas\.$/)).toBeVisible();
  });

  it("says so when the export fails", async () => {
    server.use(
      http.get(apiUrl(`${clientsPath}/export`), () =>
        problemResponse(500, "internal_error"),
      ),
    );
    const { user } = renderAdmin("/clientas");
    await rowOf("Isabel Arce");

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(
      await screen.findByText(
        "No pudimos exportar las clientas. Inténtalo de nuevo.",
      ),
    ).toBeVisible();
    expect(saved).toBeUndefined();
  });
});
