import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, boliviaCivilDate, civilDateRange } from "@pilates/mobile-core";

import { Dimensions } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { assistant, assistantRoutes, minute, session } from "./assistant-fixtures";

jest.setTimeout(20_000);

const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const todayUrl = (branchId: string) =>
  `/api/v1/sessions?branchId=${branchId}&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100&includeAttendees=true`;
const at = (minutes: number) => new Date(Date.now() + minutes * minute);
const classAt = (id: string, minutes: number, extra: Partial<typeof session> = {}) => ({
  ...session,
  id,
  startsAt: at(minutes).toISOString(),
  endsAt: at(minutes + 50).toISOString(),
  ...extra,
});

const started = classAt("session-early", -20, { classTypeName: "Mat Pilates" });
const next = {
  ...classAt("session-next", 20, { classTypeName: "Mat Pilates", bookedCount: 3, capacity: 8 }),
  attendeeInitials: ["LF", "EP", "MP"],
};
const later = classAt("session-later", 240, { classTypeName: "Reformer Pilates" });

function todayRoutes(overrides: Parameters<typeof routeFetcher>[0] = {}) {
  return {
    ...assistantRoutes(),
    [todayUrl("branch-centro")]: () => jsonResponse([started, next, later]),
    "/api/v1/staff/invoices?filter=pending": () =>
      jsonResponse({ items: [{ paymentId: "payment-1" }, { paymentId: "payment-2" }] }),
    "/api/v1/cash-closes/today?branchId=branch-centro": () =>
      jsonResponse({
        branchId: "branch-centro",
        businessDate: boliviaCivilDate(new Date()),
        expectedCentavos: 0,
        cashPaymentCount: 0,
        close: null,
      }),
    ...overrides,
  };
}

async function openToday(routes = todayRoutes()) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "assistant")} />,
  );
  await waitFor(() => expect(screen.getByLabelText("Hoy en Centro")).toBeOnTheScreen());
  return screen;
}

describe("Hoy, the Assistant's first tab (E7 pick A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens on «Hoy en <sucursal>» with the search, the bell and five tabs", async () => {
    const screen = await openToday();

    expect(screen.getByText(/^Asistente · /)).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Nombre, teléfono o correo")).toBeOnTheScreen();
    expect(screen.getByTestId("notification-bell")).toBeOnTheScreen();
    const tabs = screen
      .getAllByTestId(/^tab-/)
      .map((tab) => String(tab.props.accessibilityLabel).split(",")[0]);
    expect(tabs).toEqual(["Hoy", "Clientas", "Horario", "Caja", "Perfil"]);
  });

  it("leads with the next class and who is coming, then the later ones", async () => {
    const screen = await openToday();

    const hero = await screen.findByTestId("today-session-session-next");
    expect(within(hero).getByText(/^\d{2}:\d{2} · Mat Pilates$/)).toBeOnTheScreen();
    expect(within(hero).getByText("3 de 8")).toBeOnTheScreen();
    expect(within(hero).getAllByTestId("hero-attendee")).toHaveLength(3);
    expect(within(screen.getByTestId("today-later")).getByText("Reformer Pilates")).toBeTruthy();
    expect(screen.queryByTestId("schedule-session-session-early")).toBeNull();
  });

  it("lists what is still to do and opens it", async () => {
    const screen = await openToday();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Facturas por subir, 2" })).toBeOnTheScreen(),
    );
    expect(screen.getByText("Al final del día")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("today-cash-close"));
    await waitFor(() =>
      expect(screen.getByText("Hoy no hubo pagos en efectivo")).toBeOnTheScreen(),
    );
  });

  it("opens a Client's file from the search", async () => {
    const screen = await openToday();

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Ver clienta Lucía Fernández" }),
    );
    await waitFor(() => expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen());
  });

  it("keeps «Crear clienta nueva»", async () => {
    const screen = await openToday();

    await fireEvent.press(screen.getByRole("button", { name: "Crear clienta nueva" }));
    await waitFor(() => expect(screen.getByLabelText("Nueva clienta")).toBeOnTheScreen());
  });

  it("follows the Branch picked when she works at several", async () => {
    const urubo = { id: "branch-urubo", name: "Urubó" };
    const screen = await openToday(
      todayRoutes({
        "/api/v1/staff-members/current": () =>
          jsonResponse({ ...assistant, branches: [...assistant.branches, urubo] }),
        [todayUrl("branch-urubo")]: () =>
          jsonResponse([{ ...classAt("session-urubo", 30), branchId: "branch-urubo" }]),
      }),
    );

    await fireEvent.press(screen.getByTestId("branch-field"));
    await fireEvent.press(await screen.findByText("Urubó"));
    await waitFor(() => expect(screen.getByLabelText("Hoy en Urubó")).toBeOnTheScreen());
    expect(await screen.findByTestId("today-session-session-urubo")).toBeOnTheScreen();
  });
});

describe("Hoy on the Assistant's tablet", () => {
  beforeEach(() => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
  });

  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("caps the day's width and opens a Client's file in Clientas' panel", async () => {
    const screen = await openToday();

    expect(screen.getByTestId("assistant-centered-card")).toHaveStyle({ maxWidth: 640 });
    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Ver clienta Lucía Fernández" }),
    );
    await waitFor(() => expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen());
    expect(screen.getByLabelText("Buscar clienta")).toBeOnTheScreen();
  });
});
