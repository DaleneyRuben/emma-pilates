import { isApiError } from "../api/problem";

export type ScheduleField = "trainerStaffMemberId" | "capacity" | "date";

type Problem = { field?: ScheduleField; message: string };

// Every schedule, Session, and cancellation refusal the backend can answer
// (ADM-001 and the Session cancellation command), by its stable code.
const problems: Record<string, Problem> = {
  session_overlap: {
    message:
      "Se cruza con otra sesión de esta sucursal o con otra clase de la entrenadora.",
  },
  trainer_not_assignable: {
    field: "trainerStaffMemberId",
    message: "Esta entrenadora ya no puede dar clases en esta sucursal.",
  },
  capacity_below_bookings: {
    field: "capacity",
    message: "No puedes bajar de las reservas confirmadas.",
  },
  effective_date_invalid: {
    field: "date",
    message: "Elige una fecha desde hoy.",
  },
  schedule_rows_overlap: {
    message: "Dos días se repiten o se cruzan. Revisa las filas.",
  },
  session_not_editable: {
    message: "Esta sesión ya empezó o fue cancelada; ya no se puede cambiar.",
  },
  session_not_found: {
    message:
      "Esta sesión ya no existe. Cierra el panel y actualiza el horario.",
  },
  session_schedule_not_found: {
    message:
      "Esta serie semanal ya no existe. Cierra el panel y actualiza el horario.",
  },
  class_type_not_found: {
    message: "Ese tipo de clase ya no está activo. Elige otro.",
  },
  branch_not_found: {
    message: "Esta sucursal ya no está activa.",
  },
  invalid_schedule: {
    message: "Revisa los datos: hay un valor que no es válido.",
  },
  invalid_request: {
    message: "Revisa los datos: hay un valor que no es válido.",
  },
  session_not_cancellable: {
    message: "Esta sesión ya no se puede cancelar: empezó o ya fue cancelada.",
  },
  session_has_no_bookings: {
    message:
      "Esta sesión ya no tiene reservas; si sigue vacía, se cancela sola 2 horas antes.",
  },
  administration_access_denied: {
    message: "No tienes permiso para cambiar el horario.",
  },
  booking_access_denied: {
    message: "No tienes permiso para cambiar el horario.",
  },
};

export function scheduleProblem(error: unknown): Problem {
  if (isApiError(error)) {
    const known = problems[error.code];
    if (known !== undefined) return known;
  }
  return { message: "No pudimos guardar. Inténtalo de nuevo." };
}
