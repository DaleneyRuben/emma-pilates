import type {
  AssistantClientBookingDto,
  ClassHistoryEntryDto,
} from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { evaluationPage, evaluationRow } from "../../test/oversight-fixtures";
import { paymentPage, paymentRow } from "../../test/payment-fixtures";
import {
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const assistantClientPath = `/api/v1/assistant/clients/${lucia.id}`;

const upcoming: AssistantClientBookingDto[] = [
  {
    kind: "booking",
    bookingId: "b0000000-0000-5000-8000-000000000001",
    sessionId: "50000000-0000-5000-8000-000000000001",
    branchId: "b1000000-0000-5000-8000-000000000001",
    classTypeName: "Reformer Pilates",
    trainerName: "Daniela Ortiz",
    trainerPhoto: null,
    branchName: "Centro",
    // Thursday 5 November 2026, 18:30 in Bolivia.
    startsAt: "2026-11-05T22:30:00.000Z",
    endsAt: "2026-11-05T23:20:00.000Z",
    actionable: true,
  },
  {
    kind: "waitlist",
    waitlistEntryId: "w0000000-0000-5000-8000-000000000001",
    sessionId: "50000000-0000-5000-8000-000000000002",
    branchId: "b1000000-0000-5000-8000-000000000001",
    classTypeName: "Mat Pilates",
    trainerName: "Daniela Ortiz",
    trainerPhoto: null,
    branchName: "Centro",
    startsAt: "2026-11-06T13:00:00.000Z",
    endsAt: "2026-11-06T13:50:00.000Z",
    actionable: true,
  },
];
const history: ClassHistoryEntryDto[] = [
  {
    bookingId: "b0000000-0000-5000-8000-000000000009",
    sessionId: "50000000-0000-5000-8000-000000000009",
    classTypeName: "Barre",
    trainerName: "Carla Rojas",
    trainerPhoto: null,
    branchName: "Equipetrol",
    startsAt: "2026-10-29T22:30:00.000Z",
    endsAt: "2026-10-29T23:20:00.000Z",
  },
];

const fileReads: string[] = [];
const fileHandlers = () => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () => jsonResponse(luciaDetail)),
  acquisitionHandler(),
  http.get(apiUrl(`${assistantClientPath}/bookings`), () =>
    jsonResponse(upcoming),
  ),
  http.get(apiUrl(`${assistantClientPath}/class-history`), () =>
    jsonResponse(history),
  ),
  http.get(apiUrl("/api/v1/administrator/payments"), ({ request }) => {
    // The Pagos badge reads the studio's pending count.
    if (!new URL(request.url).searchParams.has("clientId")) return undefined;
    fileReads.push(request.url);
    return jsonResponse(
      paymentPage([
        paymentRow("02", lucia.name, {
          clientId: lucia.id,
          planName: "Paquete de 8 clases",
          amountDueCentavos: 50_200,
          method: "cash",
          state: "confirmed",
        }),
      ]),
    );
  }),
  http.get(apiUrl("/api/v1/administrator/evaluations"), ({ request }) => {
    if (!new URL(request.url).searchParams.has("clientId")) return undefined;
    fileReads.push(request.url);
    return jsonResponse(
      evaluationPage([
        evaluationRow("01", lucia.name, "2099-11-04T14:00:00.000Z", {
          nutritionistName: "Gabriela Flores",
        }),
        evaluationRow("02", lucia.name, "2020-10-02T14:00:00.000Z", {
          kind: "follow_up",
          nutritionistName: "Gabriela Flores",
        }),
      ]),
    );
  }),
];

const openLucia = async () => {
  const rendered = renderAdmin("/clientas");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  return { ...rendered, panel };
};

const tabNames = (panel: HTMLElement) =>
  within(within(panel).getByRole("tablist", { name: "Ficha de la clienta" }))
    .getAllByRole("tab")
    .map((tab) => tab.textContent);

// WEB-040 (follow-up 232): the Client file has tabs Resumen · Reservas ·
// Pagos · Evaluaciones; Pagos is hidden from the Coordinator (ADR-0102).
describe("The Client file's tabs", () => {
  useMockServer();
  beforeEach(() => {
    fileReads.length = 0;
  });

  it("opens on Resumen with the four tabs for the Administrator", async () => {
    server.use(...fileHandlers(), ...signedInHandlers());
    const { panel } = await openLucia();

    expect(tabNames(panel)).toEqual([
      "Resumen",
      "Reservas",
      "Pagos",
      "Evaluaciones",
    ]);
    expect(within(panel).getByRole("tab", { name: "Resumen" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await within(panel).findByText("5 de 8")).toBeInTheDocument();
    // A tab reads its list only when it is opened.
    expect(fileReads).toEqual([]);
  });

  it("lists the upcoming classes, the waitlist, and the past classes under Reservas", async () => {
    server.use(...fileHandlers(), ...signedInHandlers());
    const { panel, user } = await openLucia();

    await user.click(within(panel).getByRole("tab", { name: "Reservas" }));

    const next = await within(panel).findByRole("region", { name: "Próximas" });
    expect(within(next).getByText("Reformer Pilates")).toBeInTheDocument();
    expect(
      within(next).getByText("05/11/2026 · 18:30 · Daniela Ortiz · Centro"),
    ).toBeInTheDocument();
    expect(within(next).getByText("En espera")).toBeInTheDocument();
    const past = within(panel).getByRole("region", { name: "Historial" });
    expect(within(past).getByText("Barre")).toBeInTheDocument();
    expect(
      within(past).getByText("29/10/2026 · 18:30 · Carla Rojas · Equipetrol"),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("5 de 8")).not.toBeInTheDocument();
  });

  it("lists her sales under Pagos with a way to Dinero", async () => {
    server.use(...fileHandlers(), ...signedInHandlers());
    const { panel, user } = await openLucia();

    await user.click(within(panel).getByRole("tab", { name: "Pagos" }));

    expect(
      await within(panel).findByText("Paquete de 8 clases"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Bs 502,00")).toBeInTheDocument();
    expect(within(panel).getByText(/Efectivo/)).toBeInTheDocument();
    expect(within(panel).getByText("Confirmado")).toBeInTheDocument();
    expect(new URL(fileReads[0] ?? "").searchParams.get("clientId")).toBe(
      lucia.id,
    );
    expect(
      within(panel).getByRole("link", { name: "Ver en Dinero" }),
    ).toHaveAttribute("href", expect.stringContaining("/dinero/pagos"));
  });

  it("lists her Evaluations, the coming one and the done one", async () => {
    server.use(...fileHandlers(), ...signedInHandlers());
    const { panel, user } = await openLucia();

    await user.click(within(panel).getByRole("tab", { name: "Evaluaciones" }));

    const first = (
      await within(panel).findByText("Primera evaluación")
    ).closest("li") as HTMLElement;
    expect(within(first).getByText("Próxima")).toBeInTheDocument();
    expect(within(first).getByText(/Gabriela Flores/)).toBeInTheDocument();
    const followUp = within(panel)
      .getByText("Seguimiento")
      .closest("li") as HTMLElement;
    expect(within(followUp).getByText("Hecha")).toBeInTheDocument();
    const params = new URL(fileReads[0] ?? "").searchParams;
    expect(params.get("clientId")).toBe(lucia.id);
    expect(params.has("from")).toBe(false);
  });

  it("hides Pagos, courtesy classes, and returning a class from the Coordinator", async () => {
    server.use(...fileHandlers(), ...coordinatorHandlers());
    const { panel } = await openLucia();

    expect(tabNames(panel)).toEqual(["Resumen", "Reservas", "Evaluaciones"]);
    expect(await within(panel).findByText("5 de 8")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", {
        name: "Agregar clase de cortesía",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Devolver una clase" }),
    ).not.toBeInTheDocument();
  });
});

describe("The Client file at 420 px", () => {
  useMockServer();
  useNarrowViewport();

  it("fills the screen with the same tabs", async () => {
    server.use(...fileHandlers(), ...signedInHandlers());
    const { panel } = await openLucia();

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(tabNames(panel)).toHaveLength(4);
  });
});
