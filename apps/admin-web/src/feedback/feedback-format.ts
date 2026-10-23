import type {
  AdminFeedbackDto,
  AdminFeedbackDtoApp,
  AdminFeedbackDtoRole,
  AdminFeedbackDtoStatus,
  AdminFeedbackDtoType,
} from "@pilates/api-contracts";
import { boliviaToday, formatCivilMoment } from "../lib/bolivia-time";
import { toCsv } from "../lib/csv";

// The words of the «Enviar comentarios» form and of AW38 (REL-012).
export const typeLabels: Record<AdminFeedbackDtoType, string> = {
  problem: "Problema",
  suggestion: "Sugerencia",
  other: "Otro",
};

export const statusLabels: Record<AdminFeedbackDtoStatus, string> = {
  new: "Nuevo",
  reviewed: "Revisado",
  resolved: "Resuelto",
};

export const appLabels: Record<AdminFeedbackDtoApp, string> = {
  client: "App de clientas",
  staff: "App del personal",
};

export const roleLabels: Record<AdminFeedbackDtoRole, string> = {
  client: "Clienta",
  trainer: "Entrenador",
  assistant: "Asistente",
  nutritionist: "Nutricionista",
  administrator: "Administrador",
};

const systems = { android: "Android", ios: "iOS" } as const;

/** «Android 14», «iOS 18.2». */
export const systemLabel = (feedback: AdminFeedbackDto): string =>
  `${systems[feedback.platform]} ${feedback.osVersion}`;

/** «1.0.1 (3)»: the app version and its build. */
export const versionLabel = (feedback: AdminFeedbackDto): string =>
  `${feedback.appVersion} (${feedback.appBuild})`;

export const deviceLabel = (feedback: AdminFeedbackDto): string =>
  `${versionLabel(feedback)} · ${systemLabel(feedback)}`;

/**
 * AW38's «Exportar CSV»: the date, type, text, version, and «Qué cambiamos»
 * Google's production questionnaire asks for, with the app and status.
 */
export const feedbackCsv = (items: readonly AdminFeedbackDto[]): string =>
  toCsv([
    [
      "Fecha",
      "App",
      "Tipo",
      "Comentario",
      "Versión",
      "Estado",
      "Qué cambiamos",
    ],
    ...items.map((feedback) => [
      formatCivilMoment(feedback.createdAt),
      appLabels[feedback.app],
      typeLabels[feedback.type],
      feedback.text,
      deviceLabel(feedback),
      statusLabels[feedback.status],
      feedback.changeNote ?? "",
    ]),
  ]);

export const feedbackCsvName = (now: Date): string =>
  `comentarios-${boliviaToday(now)}.csv`;
