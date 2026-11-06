import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { resetPhonePrompt } from "./phone-prompt";

jest.setTimeout(30_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null as string | null,
  referralCode: "REF-LUCIA",
};

const openHome = async (phone: string | null, id = "client-1") => {
  const saved = jest.fn();
  let current = { ...profile, id, phone };
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(current),
    "PATCH /api/v1/clients/current": (init) => {
      const body = JSON.parse(String(init?.body)) as { name: string; phone: string };
      saved(body);
      current = { ...current, ...body };
      return jsonResponse(current);
    },
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({ status: "none", subscription: null }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return { saved, screen };
};

// Walkthrough 2 n.º 34 (design follow-up 254 § 1, option A): a Client
// registered before the phone rule is asked for a valid mobile in a sheet
// over Inicio; «Ahora no» closes it until the app opens again.
describe("Asking for a missing or invalid phone", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    resetPhonePrompt();
  });

  it("asks for one when she has none and saves it", async () => {
    const { saved, screen } = await openHome(null);

    expect(await screen.findByText("Agrega tu celular")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "El estudio te escribe por WhatsApp si cambia una clase o hay un aviso de tu plan.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId("phone-prompt-field"), "71234567");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(saved).toHaveBeenCalledWith({ name: "Lucía Fernández", phone: "+591 71234567" });
    });
    expect(await screen.findByText("Celular guardado")).toBeOnTheScreen();
    expect(screen.queryByText("Agrega tu celular")).toBeNull();
  });

  it("asks her to check a number that is not a valid mobile", async () => {
    const { saved, screen } = await openHome("7000004");

    expect(await screen.findByText("Revisa tu celular")).toBeOnTheScreen();
    expect(screen.getByTestId("phone-prompt-field")).toHaveProp("value", "7000004");
    expect(
      screen.getByText("Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(saved).not.toHaveBeenCalled();
  });

  it("stays away when the number is valid", async () => {
    const { screen } = await openHome("+591 70011001");

    expect(screen.queryByText("Agrega tu celular")).toBeNull();
    expect(screen.queryByText("Revisa tu celular")).toBeNull();
  });

  it("closes on «Ahora no» for the rest of this app session", async () => {
    const { saved, screen } = await openHome(null);

    await fireEvent.press(await screen.findByRole("button", { name: "Ahora no" }));

    await waitFor(() => {
      expect(screen.queryByText("Agrega tu celular")).toBeNull();
    });
    expect(saved).not.toHaveBeenCalled();
  });

  it("asks again when another Client signs in on the same phone", async () => {
    const first = await openHome(null);
    await fireEvent.press(await first.screen.findByRole("button", { name: "Ahora no" }));
    await cleanup();
    clearMobileQueryCache();

    const { screen } = await openHome(null, "client-2");

    expect(await screen.findByText("Agrega tu celular")).toBeOnTheScreen();
  });
});
