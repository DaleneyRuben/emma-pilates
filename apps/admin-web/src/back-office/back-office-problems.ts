import { isApiError } from "../api/problem";

/** The form fields a refusal can point at, named alike in every form. */
export type BackOfficeField =
  "name" | "quantity" | "staffMemberId" | "expenseCategoryId" | "date";

export type BackOfficeProblem = {
  code: string;
  field?: BackOfficeField;
  message: string;
};

const retry = "No pudimos guardar. Inténtalo de nuevo.";

// Every Back Office refusal the backend answers (BKO-002), by its stable
// code (ADR-0021), never by the problem's text.
const problems: Record<string, Omit<BackOfficeProblem, "code">> = {
  back_office_access_denied: {
    message: "No tienes permiso para cambiar el Back Office.",
  },
  branch_not_found: {
    message: "Esta sucursal ya no existe. Elige otra en la barra superior.",
  },
  branch_archived: {
    message: "Esta sucursal está archivada: ya no recibe registros nuevos.",
  },
  supply_not_found: {
    message:
      "Este insumo ya no existe. Cierra el panel para ver la lista actual.",
  },
  supply_name_taken: {
    field: "name",
    message: "Ya hay un insumo activo con ese nombre en esta sucursal.",
  },
  supply_archived: {
    message:
      "Este insumo ya está archivado. Cierra el panel para ver la lista actual.",
  },
  insufficient_stock: {
    field: "quantity",
    message: "No hay stock suficiente para ese retiro.",
  },
  invalid_request: {
    message: "Revisa los datos: hay un valor que no es válido.",
  },
  invalid_back_office_value: {
    message: "Revisa los datos: hay un valor que no es válido.",
  },
  date_in_future: {
    field: "date",
    message: "La fecha no puede ser posterior a hoy.",
  },
  staff_member_not_found: {
    field: "staffMemberId",
    message: "Esta persona ya no está en el personal. Elige otra.",
  },
  salary_payment_not_found: {
    message:
      "Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.",
  },
  expense_not_found: {
    message:
      "Este gasto ya no existe. Cierra el panel y vuelve a abrir la lista.",
  },
  expense_category_not_found: {
    field: "expenseCategoryId",
    message: "Esa categoría ya no existe. Elige otra.",
  },
  expense_category_name_taken: {
    field: "name",
    message: "Ya existe una categoría con ese nombre.",
  },
  expense_category_in_use: {
    message: "No puedes eliminarla: un gasto la usa.",
  },
};

export function backOfficeProblem(error: unknown): BackOfficeProblem {
  if (isApiError(error)) {
    const known = problems[error.code];
    if (known !== undefined) return { code: error.code, ...known };
    return { code: error.code, message: retry };
  }
  return { code: "unexpected_error", message: retry };
}
