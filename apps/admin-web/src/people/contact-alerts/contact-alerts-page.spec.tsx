import type {
  ContactAlertItemDto,
  ContactAlertListDto,
} from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  expectClientInitials,
  expectClientPhoto,
  herPhoto,
} from "../../test/client-photo-fixtures";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const path = "/api/v1/administrator/contact-alerts";

const valeria: ContactAlertItemDto = {
  clientId: "c1000000-0000-5000-8000-000000000001",
  name: "Valeria Quiroga",
  photo: null,
  phone: "+591 70011005",
  startedOn: "2026-10-02",
  reasons: ["no_booking_7_days"],
};

const daniela: ContactAlertItemDto = {
  clientId: "c1000000-0000-5000-8000-000000000002",
  name: "Daniela Rojas",
  photo: null,
  phone: null,
  startedOn: "2026-10-05",
  reasons: ["fewer_than_2_classes_by_day_15", "no_booking_7_days"],
};

const monica: ContactAlertItemDto = {
  clientId: "c1000000-0000-5000-8000-000000000003",
  name: "Mónica Salvatierra",
  photo: null,
  phone: "+54 91123456789",
  startedOn: "2026-09-20",
  reasons: ["fewer_than_4_classes_in_first_30_days"],
};

const list = (items: ContactAlertItemDto[]): ContactAlertListDto => ({
  items,
  totalItems: items.length,
});

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Para contactar" });

describe("AW39 Para contactar", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("lists clientas with phone, reasons, and WhatsApp", async () => {
    server.use(
      http.get(apiUrl(path), () =>
        jsonResponse(list([valeria, daniela, monica])),
      ),
    );
    renderAdmin("/clientas/para-contactar");
    expect(
      await screen.findByText(
        "3 clientas · seguimiento de sus primeros 90 días",
      ),
    ).toBeVisible();
    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(row).getByText("🇧🇴 +591 70011005")).toBeInTheDocument();
    expect(within(row).getByText("7 días sin reservar")).toBeInTheDocument();
    expect(within(row).getByText("02/10/2026")).toBeInTheDocument();
    const whatsapp = within(row).getByRole("link", { name: "Abrir WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/59170011005");
    expect(whatsapp).toHaveAttribute("target", "_blank");

    // FIX-037: a foreign number keeps its own code in the WhatsApp link.
    const foreign = screen
      .getByText("Mónica Salvatierra")
      .closest("tr") as HTMLElement;
    expect(within(foreign).getByText("🇦🇷 +54 91123456789")).toBeVisible();
    expect(
      within(foreign).getByRole("link", { name: "Abrir WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/5491123456789");

    const withoutPhone = screen
      .getByText("Daniela Rojas")
      .closest("tr") as HTMLElement;
    expect(within(withoutPhone).getByText("Sin teléfono")).toBeInTheDocument();
    expect(
      within(withoutPhone).getByRole("button", { name: "Abrir WhatsApp" }),
    ).toBeDisabled();
    expect(
      within(withoutPhone).getByText("Menos de 2 clases a los 15 días"),
    ).toBeInTheDocument();
  });

  it("FIX-041 shows a Client's photo, or her initials without one", async () => {
    server.use(
      http.get(apiUrl(path), () =>
        jsonResponse(list([{ ...valeria, photo: herPhoto }, daniela])),
      ),
    );
    renderAdmin("/clientas/para-contactar");

    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    expectClientPhoto(row, "Valeria Quiroga");
    const without = screen
      .getByText("Daniela Rojas")
      .closest("tr") as HTMLElement;
    expectClientInitials(without, "Daniela Rojas", "DR");
  });

  it("marks a Client contacted without a confirmation", async () => {
    let items = [valeria, daniela, monica];
    server.use(
      http.get(apiUrl(path), () => jsonResponse(list(items))),
      http.post(apiUrl(`${path}/${valeria.clientId}/contacted`), () => {
        items = [daniela, monica];
        return new Response(null, { status: 204 });
      }),
    );
    const { user } = renderAdmin("/clientas/para-contactar");
    await screen.findByText("Valeria Quiroga");

    await user.click(
      screen.getAllByRole("button", { name: "Contactada" })[0] as HTMLElement,
    );
    expect(
      await screen.findByText("Marcaste a Valeria Quiroga como contactada."),
    ).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByText("Valeria Quiroga")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("2 clientas · seguimiento de sus primeros 90 días"),
    ).toBeVisible();
  });

  it("keeps the row and shows an error when marking fails", async () => {
    server.use(
      http.get(apiUrl(path), () => jsonResponse(list([valeria]))),
      http.post(apiUrl(`${path}/${valeria.clientId}/contacted`), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    const { user } = renderAdmin("/clientas/para-contactar");
    await screen.findByText("Valeria Quiroga");

    await user.click(screen.getByRole("button", { name: "Contactada" }));
    expect(
      await screen.findByText(
        "No pudimos marcar a Valeria Quiroga. Inténtalo de nuevo.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Valeria Quiroga")).toBeInTheDocument();
  });

  it("shows the empty card", async () => {
    server.use(http.get(apiUrl(path), () => jsonResponse(list([]))));
    renderAdmin("/clientas/para-contactar");
    expect(
      await screen.findByText("Nadie para contactar por ahora."),
    ).toBeVisible();
  });

  it("is a Clientas tab for the Coordinator", async () => {
    server.use(
      ...coordinatorHandlers(),
      http.get(apiUrl(path), () => jsonResponse(list([valeria]))),
    );
    renderAdmin("/clientas/para-contactar");
    await heading();

    const tabs = screen.getByRole("navigation", {
      name: "Páginas de Clientas",
    });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Todas", "Para contactar", "Congelamientos"]);
  });
});

describe("AW39 Para contactar at 420 px", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("still names the Client and the actions", async () => {
    server.use(http.get(apiUrl(path), () => jsonResponse(list([valeria]))));
    renderAdmin("/clientas/para-contactar");
    expect(await screen.findByText("Valeria Quiroga")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Contactada" }),
    ).toBeInTheDocument();
  });
});
