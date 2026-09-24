import { isApiError } from "../../api/problem";

export type StaffField = "email" | "branchIds";

type Problem = { field?: StaffField; message: string };

// Every staff-management refusal the backend answers (IDN-007), by its
// stable code (ADR-0021).
const problems: Record<string, Problem> = {
  email_in_use: {
    field: "email",
    message: "Este correo ya pertenece a otra cuenta.",
  },
  invalid_branch_assignment: {
    field: "branchIds",
    message: "Elige sucursales activas; administración no lleva sucursales.",
  },
  email_throttled: {
    message:
      "Ya enviamos un correo a esa dirección hace poco. Inténtalo de nuevo en un momento.",
  },
  trainer_has_upcoming_sessions: {
    message:
      "Todavía tiene sesiones próximas o un horario semanal en esas sucursales. Cámbiale la entrenadora desde Horario y vuelve a intentarlo.",
  },
  last_administrator: {
    message:
      "Es la última cuenta de administración activa: no puede cambiar de rol ni desactivarse.",
  },
  own_staff_member: {
    message: "No puedes cambiar tu propio rol ni desactivar tu cuenta.",
  },
  staff_member_deactivated: {
    message: "Esta cuenta ya está desactivada.",
  },
  staff_member_not_pending: {
    message: "Esta persona ya activó su cuenta; no hace falta otro enlace.",
  },
  staff_member_not_found: {
    message:
      "Este miembro ya no existe. Cierra el panel y vuelve a abrir la lista.",
  },
  staff_access_denied: {
    message: "No tienes permiso para cambiar al personal.",
  },
  invalid_request: {
    message: "Revisa los datos: hay un valor que no es válido.",
  },
};

export function staffProblem(error: unknown): Problem {
  if (isApiError(error)) {
    const known = problems[error.code];
    if (known !== undefined) return known;
  }
  return { message: "No pudimos guardar. Inténtalo de nuevo." };
}
