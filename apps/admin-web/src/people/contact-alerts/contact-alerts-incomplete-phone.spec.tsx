import type {
  ContactAlertItemDto,
  ContactAlertListDto,
} from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const path = "/api/v1/administrator/contact-alerts";

// Walkthrough finding 114 (FIX-080): a stored phone that fits no mobile
// («7000004») reads «Celular incompleto» and opens no WhatsApp, as the Staff
// app's Para contactar does (finding 109); no phone at all reads «Sin teléfono».
const sofia: ContactAlertItemDto = {
  clientId: "c1000000-0000-5000-8000-000000000114",
  name: "Sofía Paredes",
  photo: null,
  phone: "7000004",
  startedOn: "2026-10-02",
  reasons: ["no_booking_7_days"],
};

const mariana: ContactAlertItemDto = {
  ...sofia,
  clientId: "c1000000-0000-5000-8000-000000000115",
  name: "Mariana Quiroga",
  phone: null,
};

const list = (items: ContactAlertItemDto[]): ContactAlertListDto => ({
  items,
  totalItems: items.length,
});

const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest("tr") as HTMLElement;

describe("AW39 Para contactar with an unusable phone", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(path), () => jsonResponse(list([sofia, mariana]))),
    );
  });

  it("says «Celular incompleto» and does not open WhatsApp to it", async () => {
    renderAdmin("/clientas/para-contactar");

    const row = await rowOf("Sofía Paredes");
    expect(within(row).getByText("Celular incompleto")).toBeVisible();
    expect(within(row).queryByText(/7000004/)).not.toBeInTheDocument();
    expect(
      within(row).queryByRole("link", { name: "Abrir WhatsApp" }),
    ).not.toBeInTheDocument();
    const whatsapp = within(row).getByRole("button", {
      name: "Abrir WhatsApp",
    });
    expect(whatsapp).toBeDisabled();
    expect(whatsapp).toHaveAttribute("title", "Celular incompleto");
  });

  it("keeps «Sin teléfono» for a Client with none", async () => {
    renderAdmin("/clientas/para-contactar");

    const row = await rowOf("Mariana Quiroga");
    expect(within(row).getByText("Sin teléfono")).toBeVisible();
    expect(within(row).queryByText("Celular incompleto")).not.toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Abrir WhatsApp" }),
    ).toHaveAttribute("title", "Sin teléfono");
  });
});
