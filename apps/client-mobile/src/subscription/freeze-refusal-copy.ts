const freezeRefusalCopy: Record<string, string> = {
  freeze_not_allowed: "Este plan no se puede congelar.",
  // An installed build can still receive the finer codes. ADR-0016: the
  // request path no longer sends them, and both read as a final refusal.
  freeze_start_in_past: "Este plan no se puede congelar.",
  freeze_outside_term: "Este plan no se puede congelar.",
  invalid_civil_date: "Esas fechas no son válidas.",
};

export const freezeRequestFailure = (body: unknown): string => {
  if (typeof body === "object" && body !== null) {
    const code = (body as { code?: unknown }).code;
    if (typeof code === "string" && freezeRefusalCopy[code] !== undefined) {
      return freezeRefusalCopy[code];
    }
  }
  return "No pudimos enviar la solicitud. Inténtalo de nuevo.";
};
