import type { NotificationDto } from "@pilates/api-contracts";

import { feedbackLine, reviewLine, splitStaffNotices } from "./review-notices";

const now = new Date("2026-11-26T17:00:00.000Z");

const base = {
  category: "subscription_payment",
  title: "Comprobante por revisar",
  message: "Tienes un comprobante de pago pendiente de revisión.",
  createdAt: "2026-11-26T16:40:00.000Z",
  readAt: null,
} as const;

const payment = (
  id: string,
  outcome: "pending" | "approved" | "rejected",
  decided: { by: string; at: string } | null = null,
): NotificationDto =>
  ({
    ...base,
    id,
    type: "payment_submitted",
    destinationType: "payment",
    destinationId: `payment-${id}`,
    review: {
      subject: "payment",
      clientName: "Ana Pérez",
      planName: "Trimestral 36 clases",
      amountCentavos: 186_200,
      startsOn: null,
      endsOn: null,
      outcome,
      decidedByName: decided?.by ?? null,
      decidedAt: decided?.at ?? null,
    },
  }) as NotificationDto;

const freeze = (outcome: "pending" | "approved"): NotificationDto =>
  ({
    ...base,
    id: `freeze-${outcome}`,
    type: "freeze_requested",
    title: "Congelamiento por revisar",
    destinationType: "freeze",
    destinationId: "freeze-1",
    review: {
      subject: "freeze",
      clientName: "Lucía Fernández",
      planName: "Trimestral 36 clases",
      amountCentavos: null,
      startsOn: "2026-11-23",
      endsOn: "2026-11-29",
      outcome,
      decidedByName: outcome === "pending" ? null : "Ana Torres",
      decidedAt: outcome === "pending" ? null : "2026-11-24T16:00:00.000Z",
    },
  }) as NotificationDto;

// Walkthrough n.º 12 (E-F07) and n.º 11 (E-F20).
describe("the Administrator's review and feedback notices", () => {
  it("puts pending reviews on top, decided ones below, and keeps the rest", () => {
    const other = { ...base, id: "x", type: "session_cancelled" } as NotificationDto;
    const split = splitStaffNotices([
      payment("a", "approved", { by: "Gabriela Rojas", at: "2026-11-26T16:50:00.000Z" }),
      payment("b", "pending"),
      other,
      { ...base, id: "old", type: "payment_submitted" } as NotificationDto,
    ]);

    expect(split.pending.map((item) => item.id)).toEqual(["b"]);
    expect(split.decided.map((item) => item.id)).toEqual(["a"]);
    // A server without the review fields keeps the old grouped rows.
    expect(split.rest.map((item) => item.id)).toEqual(["x", "old"]);
  });

  it("says whose receipt waits, for which plan and how much", () => {
    expect(reviewLine(payment("b", "pending"), now)).toEqual({
      title: "Ana Pérez · Trimestral 36 clases · Bs 1.862",
      detail: "Comprobante por revisar",
    });
    expect(reviewLine(freeze("pending"), now)).toEqual({
      title: "Lucía Fernández · Trimestral 36 clases",
      detail: "Congelamiento por revisar · Del lun 23 al dom 29 nov",
    });
  });

  it("says how a review was decided and by whom", () => {
    expect(
      reviewLine(
        payment("a", "approved", { by: "Gabriela Rojas", at: "2026-11-26T16:50:00.000Z" }),
        now,
      ),
    ).toEqual({
      title: "Pago de Ana Pérez aprobado por Gabriela · hace 10 minutos",
      detail: "Trimestral 36 clases · Bs 1.862",
    });
    expect(
      reviewLine(
        payment("r", "rejected", { by: "Ana Torres", at: "2026-11-26T16:50:00.000Z" }),
        now,
      ).title,
    ).toBe("Pago de Ana Pérez rechazado por Ana · hace 10 minutos");
    expect(reviewLine(freeze("approved"), now)).toEqual({
      title: "Congelamiento de Lucía Fernández aprobado por Ana · hace 2 días",
      detail: "Del lun 23 al dom 29 nov",
    });
  });

  it("says who wrote a comment and how it begins", () => {
    const notice = {
      ...base,
      id: "f1",
      type: "feedback_received",
      createdAt: "2026-11-26T16:40:00.000Z",
      feedback: {
        feedbackId: "feedback-1",
        authorName: "Ana Pérez",
        type: "problem",
        app: "client",
        excerpt: "No encuentro dónde ver mi lista de espera desde Inicio…",
      },
    } as NotificationDto;

    expect(feedbackLine(notice, now)).toEqual({
      title: "Ana Pérez · Problema: «No encuentro dónde ver mi lista de espera desde Inicio…»",
      detail: "App de clientas · Hace 20 minutos",
    });
  });
});
