import type {
  AdminFeedbackDto,
  AdminFeedbackPageDto,
} from "@pilates/api-contracts";

export const feedbackPath = "/api/v1/administrator/feedback";

export const problem: AdminFeedbackDto = {
  id: "fb000000-0000-5000-8000-000000000001",
  app: "client",
  role: "client",
  type: "problem",
  text: "No puedo ver mis reservas de mañana en la lista.",
  appVersion: "1.0.1",
  appBuild: "3",
  platform: "android",
  osVersion: "14",
  status: "new",
  changeNote: null,
  senderEmail: "valeria@example.com",
  // 20:30 on 22 October in Bolivia, already the 23rd in UTC.
  createdAt: "2026-10-23T00:30:00.000Z",
  triagedAt: null,
};

export const suggestion: AdminFeedbackDto = {
  id: "fb000000-0000-5000-8000-000000000002",
  app: "staff",
  role: "trainer",
  type: "suggestion",
  text: "Sería útil ver la lista de la clase siguiente, con comas, y «comillas».",
  appVersion: "1.0.1",
  appBuild: "4",
  platform: "ios",
  osVersion: "18.2",
  status: "resolved",
  changeNote: "Agregamos la próxima clase en Mi agenda (1.0.2).",
  senderEmail: "emma.vargas@example.com",
  createdAt: "2026-10-21T14:00:00.000Z",
  triagedAt: "2026-10-22T14:00:00.000Z",
};

export const feedbackPage = (
  items: AdminFeedbackDto[],
  totalItems = items.length,
  newCount = items.filter((item) => item.status === "new").length,
): AdminFeedbackPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems,
  newCount,
});
