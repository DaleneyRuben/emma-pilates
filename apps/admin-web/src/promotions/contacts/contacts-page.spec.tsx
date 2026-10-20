import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  contactPage,
  daniela,
  promotionContactsPath,
  valeria,
} from "../../test/promotion-contact-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const reads: URLSearchParams[] = [];
const contactList = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(promotionContactsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "Contactos para promociones",
  });

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

describe("AW35 Contactos para promociones", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the contacts with their consent date, under Promociones", async () => {
    server.use(
      contactList(() => jsonResponse(contactPage([valeria, daniela]))),
    );
    renderAdmin("/promociones/contactos");
    await heading();

    const row = await rowOf("Valeria Quiroga");
    expect(
      within(row).getByRole("cell", { name: "valeria@example.com" }),
    ).toHaveAttribute("data-label", "Correo");
    expect(within(row).getByText("+591 70011005")).toBeInTheDocument();
    expect(within(row).getByText("19/10/2026")).toBeInTheDocument();
    const noPhone = await rowOf("Daniela Rojas");
    expect(within(noPhone).getByText("—")).toBeInTheDocument();
    expect(within(noPhone).getByText("16/10/2026")).toBeInTheDocument();
    expect(
      screen.getByText(
        "2 contactos · personas que cerraron su cuenta y pidieron seguir recibiendo promociones",
      ),
    ).toBeVisible();
    expect(screen.getByText("Mostrando 2 de 2 contactos")).toBeVisible();
    expect(screen.getByRole("link", { name: "← Promociones" })).toHaveAttribute(
      "href",
      "/promociones",
    );
    expect(
      within(screen.getByRole("navigation", { name: "Secciones" })).getByRole(
        "link",
        { name: "Promociones" },
      ),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps the search in the address and sends it to the backend", async () => {
    server.use(contactList(() => jsonResponse(contactPage([valeria]))));
    const { user, router } = renderAdmin("/promociones/contactos");
    await rowOf("Valeria Quiroga");

    await user.type(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
      "vale",
    );

    await waitFor(() => expect(reads.at(-1)?.get("q")).toBe("vale"));
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      q: "vale",
    });
  });

  it("explains where contacts come from while there are none", async () => {
    server.use(contactList(() => jsonResponse(contactPage([]))));
    renderAdmin("/promociones/contactos");

    expect(
      await screen.findByText("Todavía no hay contactos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Aparecen aquí cuando una clienta cierra su cuenta y marca que quiere seguir recibiendo promociones.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });

  it("says nothing matched a search", async () => {
    server.use(contactList(() => jsonResponse(contactPage([], 0))));
    renderAdmin("/promociones/contactos?q=gutierrez");

    expect(
      await screen.findByText("No se encontró ningún contacto."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Revisa cómo escribiste el nombre, el correo o el teléfono.",
      ),
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
    const { user } = renderAdmin("/promociones/contactos");
    const row = await rowOf("Valeria Quiroga");

    await user.click(
      within(row).getByRole("button", { name: "Dejar de enviar" }),
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
    const { user } = renderAdmin("/promociones/contactos");
    const row = await rowOf("Valeria Quiroga");

    await user.click(
      within(row).getByRole("button", { name: "Dejar de enviar" }),
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
        return "blob:test/contacts";
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

    it("downloads every contact as a CSV", async () => {
      server.use(
        contactList(() => jsonResponse(contactPage([valeria], 2))),
        http.get(apiUrl(`${promotionContactsPath}/export`), () =>
          jsonResponse({ items: [valeria, daniela] }),
        ),
      );
      const { user } = renderAdmin("/promociones/contactos");
      await rowOf("Valeria Quiroga");

      await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

      await waitFor(() => expect(saved).toBeDefined());
      expect(saved?.name).toMatch(
        /^contactos-promociones-\d{4}-\d{2}-\d{2}\.csv$/,
      );
      expect(saved?.blob.type).toBe("text/csv;charset=utf-8");
      const text = await saved?.blob.text();
      expect(text?.split("\r\n")).toHaveLength(4);
      expect(text).toContain("Daniela Rojas,daniela@example.com,,16/10/2026");
    });

    it("says so when the export fails", async () => {
      server.use(
        contactList(() => jsonResponse(contactPage([valeria]))),
        http.get(apiUrl(`${promotionContactsPath}/export`), () =>
          problemResponse(500, "internal_error"),
        ),
      );
      const { user } = renderAdmin("/promociones/contactos");
      await rowOf("Valeria Quiroga");

      await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

      expect(
        await screen.findByText(
          "No pudimos exportar los contactos. Inténtalo de nuevo.",
        ),
      ).toBeVisible();
      expect(saved).toBeUndefined();
    });
  });
});
