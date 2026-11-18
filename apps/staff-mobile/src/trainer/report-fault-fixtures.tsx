import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

// Shared by the S26 specs (report-fault*.spec.tsx).
export const session = {
  bookedCount: 6,
  branchName: "Equipetrol",
  capacity: 8,
  classTypeName: "Reformer Intermedio",
  endsAt: "2026-09-10T13:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T12:00:00.000Z",
};

export const unit = (typeName: string, number: number, status = "working") => ({
  id: `${typeName.toLowerCase()}-${number}`,
  branchId: "branch-1",
  typeId: `type-${typeName.toLowerCase()}`,
  typeName,
  kind: null,
  number,
  status,
  openIssueCount: status === "working" ? 0 : 1,
  archivedAt: null,
});

type Unit = ReturnType<typeof unit>;

export const unitType = (name: string, units: Unit[]) => ({
  id: `type-${name.toLowerCase()}`,
  name,
  tracking: "unit",
  units,
  usable: 0,
  quantity: 0,
});

export const quantityType = (name: string, usable: number, quantity = usable) => ({
  id: `type-${name.toLowerCase()}`,
  name,
  tracking: "quantity",
  units: [],
  usable,
  quantity,
});

export type SessionType = ReturnType<typeof unitType> | ReturnType<typeof quantityType>;

export const equipmentOf = (types: SessionType[]) => ({
  sessionId: "session-1",
  kind: "reformer",
  typeId: types[0]?.id ?? null,
  items: [],
  types,
});

export const routes = (
  types: SessionType[] | (() => SessionType[]),
  post: () => Response = () => jsonResponse({ id: "issue-1" }, 201),
) => ({
  "/api/v1/trainer/sessions": () => jsonResponse([session]),
  "/api/v1/trainer/sessions/session-1/roster": () => jsonResponse({ ...session, bookings: [] }),
  "/api/v1/trainer/sessions/session-1/equipment": () =>
    jsonResponse(equipmentOf(typeof types === "function" ? types() : types)),
  "POST /api/v1/trainer/sessions/session-1/equipment-issues": post,
  "/api/v1/staff-members/current": () =>
    jsonResponse({
      id: "staff-1",
      name: "Emma Vargas",
      email: "emma.vargas@example.com",
      phone: null,
      role: "trainer",
      branches: [],
    }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
});

export const openReport = async (fetcher: ReturnType<typeof routeFetcher>) => {
  const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByText("Reformer Intermedio")).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Intermedio,/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Reportar una falla" })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Reportar una falla" }));
  return screen;
};

export const postedBody = (fetcher: ReturnType<typeof routeFetcher>) =>
  fetcher.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as unknown);
