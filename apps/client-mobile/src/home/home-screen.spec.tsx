import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { dehydrate, onlineManager, QueryClient } from "@tanstack/react-query";
import {
  clearMobileQueryCache,
  clearPersistedAccountCache,
  createMobilePersister,
  persistedCacheVersion,
} from "@pilates/mobile-core";

import App from "../../App";
import {
  createClientRuntime as createRuntime,
  jsonResponse,
  routeFetcher as createFetcher,
} from "../test-support";

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: "+591 70011001",
  referralCode: "REF-LUCIA",
};

const activeSubscription = {
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

const persistedProfile = {
  data: profile,
  status: 200,
};

const persistedSubscription = {
  data: activeSubscription,
  status: 200,
};

async function persistSeenQueries(): Promise<void> {
  const seeded = new QueryClient();
  seeded.setQueryData(["/api/v1/clients/current"], persistedProfile);
  seeded.setQueryData(["/api/v1/clients/current/subscription"], persistedSubscription);
  await createMobilePersister("account-1").persistClient({
    buster: persistedCacheVersion,
    clientState: dehydrate(seeded),
    timestamp: Date.now(),
  });
  seeded.clear();
}

describe("Client Home", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    onlineManager.setOnline(true);
    await clearPersistedAccountCache("account-1");
  });

  it("greets the Client and shows an active Subscription on the hero card", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    // Follow-up 227: the hero is the screen's one Rosa profundo card.
    expect(screen.getByTestId("home-plan-card")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 20,
    });
    expect(screen.getByText("Tu plan · Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("5")).toHaveStyle({ color: "#FFFFFF", fontSize: 40 });
    expect(screen.getByText("clases restantes")).toBeOnTheScreen();
    // Follow-up 177: the end is an expiry, «Vence el».
    expect(screen.getByText("Vence el 11 de octubre")).toBeOnTheScreen();
    expect(screen.getByText("Activo")).toBeOnTheScreen();
    // The walkthrough removed the underlined «Ver detalle»: «Mi plan» is the white pill.
    expect(screen.queryByText("Ver detalle")).toBeNull();
    expect(screen.getByRole("button", { name: "Mi plan" })).toHaveStyle({
      backgroundColor: "#FFFFFF",
    });
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeEnabled();
    expect(screen.queryByTestId("shortcut-lock", { includeHiddenElements: true })).toBeNull();
  });

  it("opens Mi plan from the hero card", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));

    await waitFor(() => {
      expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen();
    });
  });

  it("warns when the Subscription is about to expire", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ ...activeSubscription, status: "expiring_soon" }),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Por vencer")).toBeOnTheScreen();
    });
  });

  it("shows the next booked class and opens Mis reservas from it", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
      "/api/v1/bookings": () =>
        jsonResponse([
          {
            kind: "waitlist",
            waitlistEntryId: "waitlist-1",
            sessionId: "session-0",
            branchId: "branch-1",
            classTypeName: "Reformer",
            trainerName: "Ana Rojas",
            branchName: "Achumani",
            startsAt: "2099-11-02T12:00:00.000Z",
            endsAt: "2099-11-02T12:50:00.000Z",
          },
          {
            kind: "booking",
            bookingId: "booking-1",
            sessionId: "session-1",
            branchId: "branch-1",
            classTypeName: "Mat Pilates",
            trainerName: "Daniela Ortiz",
            branchName: "Achumani",
            startsAt: "2099-11-03T12:00:00.000Z",
            endsAt: "2099-11-03T12:50:00.000Z",
          },
        ]),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Tu próxima clase")).toBeOnTheScreen();
    });
    expect(screen.getByText("Mat Pilates")).toBeOnTheScreen();
    expect(screen.getByText("08:00 · Daniela Ortiz · Achumani")).toBeOnTheScreen();
    expect(screen.queryByText("Reformer")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: /^Tu próxima clase/ }));
    await waitFor(() => {
      expect(screen.getByText("Mis reservas")).toBeOnTheScreen();
    });
  });

  it("offers a Plan purchase and locks booking without an active Subscription", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    // The walkthrough (n.º 5): the owner's title, the price as a pill, a white pill action.
    expect(screen.getByText("Elige tu plan y empieza a moverte")).toBeOnTheScreen();
    expect(screen.getByText("Desde Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Mat y Reformer · paga por QR o en el estudio")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toHaveStyle({
      backgroundColor: "#FFFFFF",
    });
    expect(screen.getByTestId("home-purchase-card")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByText("Necesitas un plan activo")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeDisabled();
    expect(screen.queryByText("Activo")).not.toBeOnTheScreen();
    expect(screen.getByTestId("shortcut-lock", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("Su primera clase es gratis")).toBeOnTheScreen();
  });

  it("recovers from a failed load with a retry", async () => {
    let attempts = 0;
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse({ code: "unexpected_error", status: 500 }, 500)
          : jsonResponse(activeSubscription);
      },
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tu inicio.")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Tu plan · Paquete de 8 clases")).toBeOnTheScreen();
    });
  });

  it("renders Inicio from the last loaded profile when the network fails", async () => {
    await persistSeenQueries();
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => {
        throw new TypeError("Network request failed");
      },
      "/api/v1/clients/current/subscription": () => {
        throw new TypeError("Network request failed");
      },
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    expect(screen.getByText("Tu plan · Paquete de 8 clases")).toBeOnTheScreen();
    expect(
      screen.getByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos cargar tu inicio.")).not.toBeOnTheScreen();
  });

  it("shows the offline banner when only the subscription refresh fails over cached data", async () => {
    await persistSeenQueries();
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => {
        throw new TypeError("Network request failed");
      },
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    expect(screen.getByText("Tu plan · Paquete de 8 clases")).toBeOnTheScreen();
    expect(
      screen.getByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).toBeOnTheScreen();
  });

  it("shows the load error when nothing was persisted and the network fails", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => {
        throw new TypeError("Network request failed");
      },
      "/api/v1/clients/current/subscription": () => {
        throw new TypeError("Network request failed");
      },
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tu inicio.")).toBeOnTheScreen();
    });
    expect(
      screen.queryByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Hola, Lucía")).not.toBeOnTheScreen();
  });

  it("drops the offline banner and shows the fresh profile when the connection returns", async () => {
    await persistSeenQueries();
    let offline = true;
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => {
        if (offline) throw new TypeError("Network request failed");
        return jsonResponse({ ...profile, name: "Lucía Actualizada" });
      },
      "/api/v1/clients/current/subscription": () => {
        if (offline) throw new TypeError("Network request failed");
        return jsonResponse(activeSubscription);
      },
    });
    onlineManager.setOnline(false);
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    offline = false;
    await act(async () => {
      onlineManager.setOnline(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText("Tu plan · Paquete de 8 clases")).toBeOnTheScreen();
    expect(
      screen.queryByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).not.toBeOnTheScreen();
  });
});
