import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const feedbackId = "44444444-4444-4444-8444-444444444444";
const comment = {
  id: feedbackId,
  app: "client",
  role: "client",
  type: "problem",
  text: "No encuentro dónde ver mi lista de espera desde Inicio. Tengo que entrar a Mis reservas cada vez.",
  appVersion: "1.1.0",
  appBuild: "12",
  platform: "ios",
  osVersion: "26.2",
  status: "new",
  changeNote: null,
  senderEmail: "ana@example.com",
  senderName: "Ana Pérez",
  senderClientId: "c1000000-0000-4000-8000-000000000001",
  senderGender: null,
  createdAt: "2026-11-26T15:20:00.000Z",
  triagedAt: null,
};
const pageOf = (items: unknown[], totalItems = items.length) => ({
  items,
  page: 1,
  pageSize: 50,
  totalItems,
  newCount: 19,
  reviewedCount: 3,
  resolvedCount: 7,
});

const staffMember = (role: string) =>
  jsonResponse({
    id: "staff-1",
    name: "Ana Torres",
    email: "ana.torres@example.com",
    phone: null,
    role,
    branches: [],
  });

async function openComments() {
  const lists: string[] = [];
  const triaged: unknown[] = [];
  const routes = routeFetcher({
    "/api/v1/staff-members/current": () => staffMember("administrator"),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    [`/api/v1/administrator/feedback/${feedbackId}`]: () => jsonResponse(comment),
    [`POST /api/v1/administrator/feedback/${feedbackId}/triage`]: (init) => {
      triaged.push(JSON.parse(String(init?.body)));
      return jsonResponse({ ...comment, status: "reviewed" });
    },
  });
  // The list answers by its query: four comments once filtered by type.
  const fetcher = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path.startsWith("/api/v1/administrator/feedback?")) {
      lists.push(path);
      return Promise.resolve(
        jsonResponse(pageOf([comment], path.includes("type=problem") ? 4 : 19)),
      );
    }
    return routes(input, init);
  }) as unknown as typeof globalThis.fetch;
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await fireEvent.press(await screen.findByRole("button", { name: "Comentarios" }));
  await waitFor(() => expect(screen.getByText("Ana Pérez")).toBeOnTheScreen());
  return { lists, screen, triaged };
}

// Walkthrough n.º 11 (E-F18, E-F25, E-F26, E-F19): the Administrator reads and
// triages comments from the Staff app, like the admin web.
describe("Comentarios in the Staff app", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists the new comments with who sent them, from where, and the text", async () => {
    const { lists, screen } = await openComments();

    expect(screen.getByRole("tab", { name: "Nuevos · 19" })).toBeOnTheScreen();
    expect(screen.getByText("19 comentarios")).toBeOnTheScreen();
    expect(screen.getByText("Problema · App de clientas")).toBeOnTheScreen();
    expect(screen.getByText(comment.text)).toBeOnTheScreen();
    expect(lists.at(-1)).toContain("status=new");

    await fireEvent.press(screen.getByRole("tab", { name: "Revisados" }));
    await waitFor(() => expect(lists.at(-1)).toContain("status=reviewed"));
  });

  it("filters by type and app with one removable chip", async () => {
    const { lists, screen } = await openComments();

    await fireEvent.press(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Filtrar comentarios")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "Problema" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Clientas" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Ver 4 comentarios" }));

    await waitFor(() => expect(lists.at(-1)).toContain("type=problem"));
    expect(lists.at(-1)).toContain("app=client");
    expect(screen.getByRole("button", { name: "Filtrar · 2" })).toBeOnTheScreen();
    expect(screen.getByText("Problema · Clientas")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Quitar filtro" }));
    await waitFor(() => expect(lists.at(-1)).not.toContain("type="));
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeOnTheScreen();
  });

  it("opens a comment and marks it reviewed with an internal note", async () => {
    const { screen, triaged } = await openComments();

    await fireEvent.press(screen.getByRole("button", { name: /^Ana Pérez/ }));

    expect(await screen.findByText("Clienta · ana@example.com")).toBeOnTheScreen();
    expect(screen.getByText("App de clientas · 1.1.0 · iOS 26.2")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Revisado" }));
    await fireEvent.changeText(
      screen.getByLabelText("Qué cambiamos"),
      "Arreglamos la lista en la 1.1.1.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(triaged).toEqual([
        { status: "reviewed", changeNote: "Arreglamos la lista en la 1.1.1." },
      ]),
    );
  });

  it("keeps Comentarios out of a Trainer's Perfil", async () => {
    const fetcher = routeFetcher({
      "/api/v1/staff-members/current": () => staffMember("trainer"),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "trainer")} />);
    await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
      timeout: 10_000,
    });
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await screen.findByRole("button", { name: "Enviar comentarios" });

    expect(screen.queryByRole("button", { name: "Comentarios" })).not.toBeOnTheScreen();
  });
});
