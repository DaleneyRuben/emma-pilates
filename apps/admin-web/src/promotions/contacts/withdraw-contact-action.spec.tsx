import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  contactPage,
  daniela,
  paula,
  promotionContactsPath,
  valeria,
} from "../../test/promotion-contact-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const withdrawal = () => {
  const withdrawn: string[] = [];
  return {
    withdrawn,
    handler: http.post(
      apiUrl(`${promotionContactsPath}/:contactId/withdrawal`),
      ({ params }) => {
        withdrawn.push(String(params.contactId));
        return new HttpResponse(null, { status: 204 });
      },
    ),
  };
};

// Answers each page of `contacts` minus the withdrawn ones, as the backend.
const contactList = (
  contacts: AdminPromotionContactDto[],
  withdrawn: string[],
  pageSize = 1,
) =>
  http.get(apiUrl(promotionContactsPath), ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get("page"));
    const kept = contacts.filter(({ id }) => !withdrawn.includes(id));
    return jsonResponse({
      ...contactPage(
        kept.slice((page - 1) * pageSize, page * pageSize),
        kept.length,
      ),
      page,
      pageSize,
    });
  });

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

const searchOf = (router: ReturnType<typeof renderAdmin>["router"]) =>
  router.state.matches.at(-1)?.search;

describe("AW35 «Dejar de enviar»", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("names each row's button after its contact", async () => {
    server.use(
      http.get(apiUrl(promotionContactsPath), () =>
        jsonResponse(contactPage([valeria, paula])),
      ),
    );
    renderAdmin("/promociones/contactos");

    const former = await rowOf("Valeria Quiroga");
    expect(
      within(former).getByRole("button", {
        name: "Dejar de enviar a Valeria Quiroga",
      }),
    ).toHaveTextContent("Dejar de enviar");
    const live = await rowOf("Paula Antelo");
    expect(
      within(live).getByRole("button", {
        name: "Dejar de enviar a Paula Antelo",
      }),
    ).toHaveTextContent("Dejar de enviar");
  });

  it("goes back a page when the last contact of a later page leaves", async () => {
    const { withdrawn, handler } = withdrawal();
    server.use(contactList([daniela, valeria], withdrawn), handler);
    const { user, router } = renderAdmin(
      "/promociones/contactos?page=2&pageSize=1",
    );
    const row = await rowOf("Valeria Quiroga");

    await user.click(
      within(row).getByRole("button", {
        name: "Dejar de enviar a Valeria Quiroga",
      }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Borrar contacto",
      }),
    );

    await waitFor(() => expect(searchOf(router)).toMatchObject({ page: 1 }));
    expect(await rowOf("Daniela Rojas")).toBeVisible();
    expect(
      screen.getByText("Borramos el contacto de Valeria Quiroga."),
    ).toBeVisible();
    expect(
      screen.queryByText("No se encontró ningún contacto."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay contactos.")).toBeNull();
  });

  it("clears the success line on a new search", async () => {
    const { withdrawn, handler } = withdrawal();
    server.use(contactList([paula, daniela], withdrawn, 20), handler);
    const { user } = renderAdmin("/promociones/contactos");
    const row = await rowOf("Paula Antelo");

    await user.click(
      within(row).getByRole("button", {
        name: "Dejar de enviar a Paula Antelo",
      }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Dejar de enviar",
      }),
    );
    const notice = await screen.findByText(
      "Paula Antelo ya no recibirá promociones.",
    );
    await user.type(
      screen.getByRole("searchbox", {
        name: "Buscar por nombre, correo o teléfono",
      }),
      "dan",
    );

    await waitFor(() => expect(notice).not.toBeInTheDocument());
  });

  it("clears the success line on a new page", async () => {
    const { withdrawn, handler } = withdrawal();
    server.use(contactList([paula, daniela, valeria], withdrawn), handler);
    const { user, router } = renderAdmin("/promociones/contactos?pageSize=1");
    const row = await rowOf("Paula Antelo");

    await user.click(
      within(row).getByRole("button", {
        name: "Dejar de enviar a Paula Antelo",
      }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Dejar de enviar",
      }),
    );
    const notice = await screen.findByText(
      "Paula Antelo ya no recibirá promociones.",
    );
    await rowOf("Daniela Rojas");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(searchOf(router)).toMatchObject({ page: 2 }));
    expect(await rowOf("Valeria Quiroga")).toBeVisible();
    expect(notice).not.toBeInTheDocument();
  });
});
