import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import type { ReactNode } from "react";

import { EditReferralCode, ReferralCodeCard } from "./own-referral-code";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

type Route = (init: RequestInit | undefined, url: URL) => Response;

const fetcherFor = (routes: Record<string, Route>) =>
  jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "https://api.test");
    const route = routes[`${init?.method ?? "GET"} ${url.pathname}`];
    if (route === undefined) throw new Error(`unexpected ${url.pathname}`);
    return route(init, url);
  }) as unknown as typeof fetch;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const takenCodes = new Set(["SOFIA"]);
const availability: Route = (_init, url) => {
  const code = url.searchParams.get("code") ?? "";
  const status = code === "LUCIA" ? "current" : takenCodes.has(code) ? "in_use" : "available";
  return json({ code, status });
};

describe("own referral code (BKM-017)", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("copies the code and tells the screen it was copied", async () => {
    const onCopied = jest.fn();
    const screen = await render(<ReferralCodeCard code="LUCIA" onCopied={onCopied} />);

    expect(screen.getByText("LUCIA")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Copiar" }));

    await waitFor(() => {
      expect(onCopied).toHaveBeenCalled();
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("LUCIA");
  });

  it("checks the new code live, confirms that the old one stops working, and saves it", async () => {
    jest.useFakeTimers();
    const onChanged = jest.fn();
    const saved: unknown[] = [];
    const fetcher = fetcherFor({
      "GET /api/v1/referral-codes/current": () =>
        json({ referralCode: "LUCIA", editableFrom: null }),
      "GET /api/v1/referral-codes/availability": availability,
      "PUT /api/v1/referral-codes/current": (init) => {
        saved.push(JSON.parse(String(init?.body)));
        return json({ referralCode: "LU-PILATES", editableFrom: "2026-12-03T12:00:00.000Z" });
      },
    });
    const screen = await render(<EditReferralCode fetcher={fetcher} onChanged={onChanged} />, {
      wrapper,
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Editar código" }));
    const field = screen.getByLabelText("Tu nuevo código");
    await fireEvent.changeText(field, "sofia");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(await screen.findByText("Ya está en uso")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Guardar código" })).toBeDisabled();

    await fireEvent.changeText(field, "lu pilates");
    expect(field.props.value).toBe("LUPILATES");
    await fireEvent.changeText(field, "lu-pilates");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(await screen.findByText("Disponible")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar código" }));

    expect(
      screen.getByText(
        "Tu código anterior LUCIA dejará de funcionar. Las amigas que ya se registraron con él siguen contando para ti.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar código" }));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith("LU-PILATES");
    });
    expect(saved).toEqual([{ referralCode: "LU-PILATES" }]);
    jest.useRealTimers();
  });

  it("says when she can change it again inside the 30 days", async () => {
    jest.useFakeTimers({ now: new Date("2026-11-03T12:00:00.000Z") });
    const fetcher = fetcherFor({
      "GET /api/v1/referral-codes/current": () =>
        json({ referralCode: "LUCIA", editableFrom: "2026-12-03T12:00:00.000Z" }),
    });
    const screen = await render(<EditReferralCode fetcher={fetcher} onChanged={jest.fn()} />, {
      wrapper,
    });

    expect(
      await screen.findByText("Podrás cambiarlo de nuevo el 3 de diciembre"),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Editar código" })).toBeNull();
    jest.useRealTimers();
  });

  it.each([
    ["referral_code_in_use", 409, "Ya está en uso"],
    ["referral_code_change_too_soon", 409, "Solo puedes cambiarlo una vez cada 30 días"],
    ["unexpected_error", 500, "No pudimos guardar tu código. Intenta de nuevo."],
  ])("shows the server's answer %s on saving", async (code, status, line) => {
    const fetcher = fetcherFor({
      "GET /api/v1/referral-codes/current": () =>
        json({ referralCode: "LUCIA", editableFrom: null }),
      "GET /api/v1/referral-codes/availability": availability,
      "PUT /api/v1/referral-codes/current": () => json({ code, status }, status),
    });
    const onChanged = jest.fn();
    const screen = await render(<EditReferralCode fetcher={fetcher} onChanged={onChanged} />, {
      wrapper,
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Editar código" }));
    await fireEvent.changeText(screen.getByLabelText("Tu nuevo código"), "LUPI");
    expect(await screen.findByText("Disponible", {}, { timeout: 2000 })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar código" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar código" }));

    expect(await screen.findByText(line)).toBeOnTheScreen();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
