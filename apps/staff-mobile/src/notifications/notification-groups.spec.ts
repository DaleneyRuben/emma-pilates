import type { NotificationDto } from "@pilates/api-contracts";

import { groupNotifications } from "./notification-groups";

const notice = (
  id: string,
  type: string,
  createdAt: string,
  readAt: string | null = null,
  title = "Aviso",
): NotificationDto => ({
  id,
  category: "subscription_payment",
  type,
  title,
  message: `Mensaje ${id}`,
  createdAt,
  readAt,
});

describe("groupNotifications", () => {
  it("collapses notices of the same type into one group, newest first", () => {
    const entries = groupNotifications([
      notice("f1", "feedback_received", "2026-11-18T15:00:00.000Z"),
      notice("p1", "payment_confirmed", "2026-11-18T14:00:00.000Z", null, "Pago confirmado"),
      notice("f2", "feedback_received", "2026-11-17T15:00:00.000Z", "2026-11-17T16:00:00.000Z"),
      notice("f3", "feedback_received", "2026-11-16T15:00:00.000Z"),
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: "group",
      key: "feedback_received",
      label: "3 comentarios nuevos",
      unreadCount: 2,
    });
    expect(entries[0]?.kind === "group" && entries[0].items.map((item) => item.id)).toEqual([
      "f1",
      "f2",
      "f3",
    ]);
    expect(entries[1]).toMatchObject({ kind: "single", notification: { id: "p1" } });
  });

  it("names an unknown type by its title and count", () => {
    const entries = groupNotifications([
      notice("a", "something_new", "2026-11-18T15:00:00.000Z", null, "Aviso nuevo"),
      notice("b", "something_new", "2026-11-18T14:00:00.000Z", null, "Aviso nuevo"),
    ]);

    expect(entries[0]).toMatchObject({ kind: "group", label: "Aviso nuevo · 2" });
  });

  it("keeps a lone notice as a single row", () => {
    const entries = groupNotifications([
      notice("c", "session_cancelled", "2026-11-18T15:00:00.000Z"),
    ]);

    expect(entries).toEqual([
      expect.objectContaining({
        kind: "single",
        notification: expect.objectContaining({ id: "c" }),
      }),
    ]);
  });

  it("uses the plural copy of each staff notice", () => {
    const pair = (type: string) =>
      groupNotifications([
        notice("1", type, "2026-11-18T15:00:00.000Z"),
        notice("2", type, "2026-11-18T14:00:00.000Z"),
      ])[0];

    expect(pair("payment_submitted")).toMatchObject({ label: "2 comprobantes por revisar" });
    expect(pair("freeze_requested")).toMatchObject({ label: "2 congelamientos por revisar" });
    expect(pair("session_cancelled")).toMatchObject({ label: "2 clases canceladas" });
    expect(pair("session_assigned")).toMatchObject({ label: "2 clases nuevas asignadas" });
    expect(pair("evaluation_booked")).toMatchObject({ label: "2 evaluaciones nuevas" });
  });
});
