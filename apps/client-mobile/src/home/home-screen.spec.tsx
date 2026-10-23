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

  it("greets the Client and shows an active Subscription", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("5 de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("Pagado hasta el 11 de octubre")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeEnabled();
    // MOB-041: 02 ends its full-width «Reservar una clase» shortcut in a Palo
    // de rosa chevron; its two tiles carry none.
    const chevrons = screen.getAllByTestId("chevron", { includeHiddenElements: true });
    expect(chevrons).toHaveLength(1);
    expect(chevrons[0]).toHaveProp("stroke", "#B78380");
    expect(chevrons[0]).toHaveProp("width", 19);
    expect(screen.queryByTestId("shortcut-lock", { includeHiddenElements: true })).toBeNull();
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

  it("offers a Plan purchase and disables booking without an active Subscription", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    expect(screen.getByText("Necesitas un plan activo para reservar")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeDisabled();
    expect(screen.queryByText("Activa")).not.toBeOnTheScreen();
    // MOB-041: the disabled shortcut ends in the quiet lock instead of the chevron.
    const lock = screen.getByTestId("shortcut-lock", { includeHiddenElements: true });
    expect(lock).toHaveProp("stroke", "#C4BAB6");
    expect(lock).toHaveProp("width", 19);
    expect(screen.queryAllByTestId("chevron", { includeHiddenElements: true })).toHaveLength(0);
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
      expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
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
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(
      screen.getByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos cargar tu inicio.")).not.toBeOnTheScreen();
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
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(
      screen.queryByText("Sin conexión. Mostrando tus datos de la última vez."),
    ).not.toBeOnTheScreen();
  });
});
