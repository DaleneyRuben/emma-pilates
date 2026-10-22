import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Alert } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const administrator = {
  id: "staff-1",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};
const trainerProfile = {
  id: "staff-2",
  name: "Camila Rojas",
  email: "camila.rojas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Equipetrol" }],
};
const member = (id: string, name: string, role: string, branchIds: string[]) => ({
  id,
  accountId: `${id}-account`,
  name,
  email: `${id}@example.com`,
  phone: null,
  role,
  branchIds,
  status: "active",
  activationExpiresAt: null,
});
const staffPage = {
  items: [
    member("staff-2", "Camila Rojas", "trainer", ["branch-1"]),
    member("staff-3", "Emma Vargas", "trainer", ["branch-1", "branch-2"]),
    member("staff-4", "Julia Zapata", "assistant", ["branch-1"]),
    member("staff-5", "Daniela Arce", "nutritionist", ["branch-2"]),
    member("staff-1", "Paola Mendoza", "administrator", []),
  ],
  page: 1,
  pageSize: 100,
  totalItems: 5,
};
const branches = [
  { id: "branch-1", name: "Equipetrol", address: "" },
  { id: "branch-2", name: "Centro", address: "" },
];

function impersonationOf(expiresAt: Date) {
  return {
    id: "impersonation-1",
    staffMemberId: "staff-2",
    staffMemberName: "Camila Rojas",
    role: "trainer" as const,
    expiresAt: expiresAt.toISOString(),
  };
}

function routes(current: () => unknown, calls: { method: string; path: string; body?: unknown }[]) {
  return {
    "/api/v1/staff-members/current": () => jsonResponse(current()),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/notifications": () => jsonResponse({ items: [], hasMore: false, nextCursor: null }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "/api/v1/administrator/staff-members": () => jsonResponse(staffPage),
    "/api/v1/branches": () => jsonResponse(branches),
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "POST /api/v1/impersonations": (init?: RequestInit) => {
      calls.push({
        method: "POST",
        path: "/api/v1/impersonations",
        body: JSON.parse(String(init?.body)),
      });
      return jsonResponse(impersonationOf(new Date(Date.now() + 28 * 60_000 + 5_000)), 201);
    },
    "DELETE /api/v1/impersonations/current": () => {
      calls.push({ method: "DELETE", path: "/api/v1/impersonations/current" });
      return new Response(null, { status: 204 });
    },
  };
}

describe("Administrator impersonation in the Staff app (FUT-001)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("sees the app as a Trainer from Perfil, under the banner, and leaves through «Salir»", async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    let profile: unknown = administrator;
    const runtime = createStaffRuntime(routeFetcher(routes(() => profile, calls)), "administrator");
    const acting = { accountId: "trainer-account", role: "trainer" as const };
    runtime.sessionManager.refresh = jest
      .fn()
      .mockResolvedValueOnce({
        ...acting,
        impersonation: impersonationOf(new Date(Date.now() + 28 * 60_000 + 5_000)),
      })
      .mockResolvedValueOnce({ accountId: "account-1", role: "administrator" });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = await render(<App runtime={runtime} />);

    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver la app como…" })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Ver la app como…" }));
    await waitFor(() => expect(screen.getByText("Camila Rojas")).toBeOnTheScreen());
    expect(screen.getByText("Entrenadoras")).toBeOnTheScreen();
    expect(screen.getByText("Asistentes")).toBeOnTheScreen();
    expect(screen.getByText("Nutricionistas")).toBeOnTheScreen();
    expect(screen.getByText("Equipetrol, Centro")).toBeOnTheScreen();
    expect(screen.queryByText("Paola Mendoza")).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        "Verás la app tal como la ve esa persona, con sus clases y sus sucursales, durante 30 minutos. Puedes salir cuando quieras desde la franja de arriba.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Camila Rojas" }));
    expect(alert).toHaveBeenCalledWith(
      "¿Ver la app como Camila Rojas?",
      "Durante 30 minutos verás sus clases y sus sucursales y podrás actuar como ella. Todo lo que hagas quedará registrado a tu nombre.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancelar" }),
        expect.objectContaining({ text: "Ver como Camila" }),
      ]),
    );
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    profile = trainerProfile;
    await act(async () => {
      await buttons.find((button) => button.text === "Ver como Camila")?.onPress?.();
    });

    await waitFor(() => expect(screen.getByText("Viendo como Camila Rojas")).toBeOnTheScreen());
    expect(calls).toEqual([
      { method: "POST", path: "/api/v1/impersonations", body: { staffMemberId: "staff-2" } },
    ]);
    expect(screen.getByText("Entrenadora · Quedan 28 min")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mi agenda")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Pagos pendientes")).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Salir de ver como Camila Rojas" }));
    profile = administrator;
    await waitFor(() => expect(screen.getByLabelText("Pagos pendientes")).toBeOnTheScreen());
    expect(calls[1]).toEqual({ method: "DELETE", path: "/api/v1/impersonations/current" });
    expect(screen.getByText("Dejaste de ver la app como Camila Rojas.")).toBeOnTheScreen();
    expect(screen.queryByText("Viendo como Camila Rojas")).not.toBeOnTheScreen();
  });

  it("returns to Pagos pendientes on its own when the 30 minutes run out", async () => {
    const calls: { method: string; path: string }[] = [];
    const runtime = createStaffRuntime(
      routeFetcher(routes(() => trainerProfile, calls)),
      "trainer",
    );
    runtime.sessionManager.restore = jest.fn().mockResolvedValue({
      accountId: "trainer-account",
      role: "trainer",
      impersonation: impersonationOf(new Date(Date.now() + 1_500)),
    });
    runtime.sessionManager.refresh = jest
      .fn()
      .mockResolvedValue({ accountId: "account-1", role: "administrator" });
    const screen = await render(<App runtime={runtime} />);

    await waitFor(() => expect(screen.getByText("Viendo como Camila Rojas")).toBeOnTheScreen());
    expect(screen.getByText("Entrenadora · Quedan 0 min")).toBeOnTheScreen();

    await waitFor(() => expect(screen.getByLabelText("Pagos pendientes")).toBeOnTheScreen(), {
      timeout: 8_000,
    });
    expect(
      screen.getByText("Terminó el tiempo para ver la app como Camila Rojas."),
    ).toBeOnTheScreen();
    expect(calls).toEqual([]);
  });

  it("offers «Ver la app como…» only to an Administrator who is not already seeing the app as someone", async () => {
    const runtime = createStaffRuntime(routeFetcher(routes(() => trainerProfile, [])), "trainer");
    const screen = await render(<App runtime={runtime} />);

    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
    await waitFor(() => expect(screen.getByText("Camila Rojas")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "Ver la app como…" })).not.toBeOnTheScreen();
  });
});
