import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};

const history = [
  {
    bookingId: "booking-3",
    sessionId: "session-3",
    classTypeName: "Mat Pilates",
    trainerName: "Daniela Ortiz",
    branchName: "Urubó",
    startsAt: "2026-09-05T13:00:00.000Z",
    endsAt: "2026-09-05T13:50:00.000Z",
  },
  {
    bookingId: "booking-2",
    sessionId: "session-2",
    classTypeName: "Reformer Pilates",
    trainerName: "Emma Vargas",
    branchName: "Centro",
    startsAt: "2026-08-26T11:00:00.000Z",
    endsAt: "2026-08-26T11:50:00.000Z",
  },
  {
    bookingId: "booking-1",
    sessionId: "session-1",
    classTypeName: "Reformer Pilates",
    trainerName: "Emma Vargas",
    branchName: "Centro",
    startsAt: "2026-08-19T11:00:00.000Z",
    endsAt: "2026-08-19T11:50:00.000Z",
  },
];

async function openHistory(entries: unknown[]) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(active),
          "/api/v1/bookings": () => jsonResponse([]),
          "/api/v1/bookings/history": () => jsonResponse(entries),
        }),
      )}
    />,
  );

  await waitFor(
    () => {
      expect(
        screen.getByRole("button", { name: /Mis Reservas, tab/ }),
      ).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Ver historial" })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: "Ver historial" }));
  await waitFor(() => {
    expect(screen.getByText("Historial de clases")).toBeOnTheScreen();
  });

  return screen;
}

describe("Client Class History", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("groups attended classes by month, newest first", async () => {
    const screen = await openHistory(history);

    await waitFor(() => {
      expect(screen.getByText("Septiembre 2026")).toBeOnTheScreen();
    });
    expect(screen.getByText("Agosto 2026")).toBeOnTheScreen();
    expect(screen.getByText("Mat Pilates")).toBeOnTheScreen();
    expect(screen.getAllByText("Reformer Pilates")).toHaveLength(2);
    expect(screen.getByText("Daniela Ortiz · Urubó")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("sábado 5 de septiembre, Mat Pilates, Daniela Ortiz · Urubó"),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeOnTheScreen();
  });

  // MOB-040: the 07 frame draws rows between rules on Superficie, not cards.
  it("draws each class as a ruled row with its day, under a summary and month counts", async () => {
    const screen = await openHistory(history);

    await waitFor(() => {
      expect(screen.getByText("Has asistido a")).toBeOnTheScreen();
    });
    expect(screen.getByText("3 clases desde agosto")).toHaveStyle({ fontSize: 26 });
    expect(screen.getByText("2 clases")).toBeOnTheScreen();
    expect(screen.getByText("05")).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 20 });
    expect(screen.getByText("sáb")).toBeOnTheScreen();

    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    expect(StyleSheet.flatten(rows[0].props.style)).not.toHaveProperty("backgroundColor");
    expect(StyleSheet.flatten(rows[1].props.style)).toMatchObject({
      borderBottomColor: "#EFE7DE",
      borderBottomWidth: 1,
    });
    expect(screen.getByText("Septiembre 2026").parent).toHaveStyle({
      borderBottomColor: "#D8C9BB",
    });
  });

  it("shows a calm empty state", async () => {
    const screen = await openHistory([]);

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes clases en tu historial."),
      ).toBeOnTheScreen();
    });
  });

  // MOB-040: the 07 frame's empty state is the bare clock, Lora 21 title, and note.
  it("centres the empty state with the quiet clock and the frame's note", async () => {
    const screen = await openHistory([]);

    await waitFor(() => {
      expect(screen.getByText("Aún no tienes clases en tu historial.")).toHaveStyle({
        fontFamily: "Lora_500Medium",
        fontSize: 21,
      });
    });
    expect(
      screen.getByTestId("empty-state-icon-clock", { includeHiddenElements: true }),
    ).toHaveProp("stroke", "#C4BAB6");
    expect(
      screen.getByText(
        "Aquí aparecerán tus clases una vez que registremos tu asistencia en el estudio.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("Aquí verás las clases a las que asististe."),
    ).not.toBeOnTheScreen();
  });
});
