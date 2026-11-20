import { formatListDate, type NutritionistAgendaEntryDto } from "@pilates/api-contracts";

import { contactPhoneLabel, contactWhatsAppHref } from "../coordinator/contact-list-copy";
import { addCivilDays, civilDateChip, civilDateOf, clockTime } from "./nutritionist-format";

const kindLabel: Record<NutritionistAgendaEntryDto["kind"], string> = {
  first: "Primera evaluación",
  follow_up: "Seguimiento",
};

// An older API sends neither field: no payment word and no phone.
const paidSuffix = (entry: NutritionistAgendaEntryDto): string =>
  entry.paymentConfirmed === true ? " · Pagada" : "";

const phoneOf = (entry: NutritionistAgendaEntryDto): string | null => entry.clientPhone ?? null;

/** The block's big line: «Hoy · 09:45», «Mañana · 09:45», or «Lun 23 nov · 09:45». */
export function nextAppointmentTitle(entry: NutritionistAgendaEntryDto, today: string): string {
  const date = civilDateOf(entry.startsAt);
  const day =
    date === today || date === addCivilDays(today, 1)
      ? civilDateChip(date, today)
      : formatListDate(date).replace(/^./, (first) => first.toUpperCase());
  return `${day} · ${clockTime(entry.startsAt)}`;
}

/** «Primera evaluación · 45 min · Pagada» under her name in the block. */
export function nextAppointmentDetail(entry: NutritionistAgendaEntryDto): string {
  return `${kindLabel[entry.kind]} · ${entry.durationMinutes} min${paidSuffix(entry)}`;
}

/** A «Después» row's quiet line: «lun 23 nov · Seguimiento · Pagada». */
export function laterAppointmentMeta(entry: NutritionistAgendaEntryDto, today: string): string {
  return `${civilDateChip(civilDateOf(entry.startsAt), today)} · ${kindLabel[entry.kind]}${paidSuffix(entry)}`;
}

/** The wa.me link to her phone, or null when it cannot open WhatsApp (as Para contactar does). */
export function appointmentWhatsAppHref(entry: NutritionistAgendaEntryDto): string | null {
  return contactWhatsAppHref(phoneOf(entry));
}

/** Why the block has no WhatsApp button: «Sin teléfono» or «Celular incompleto». */
export function missingWhatsAppNote(entry: NutritionistAgendaEntryDto): string {
  return `${contactPhoneLabel(phoneOf(entry))} para WhatsApp`;
}

/** A started Evaluation can no longer be cancelled (evaluation_started). */
export function isCancellable(entry: NutritionistAgendaEntryDto, now = Date.now()): boolean {
  return new Date(entry.startsAt).getTime() > now;
}
