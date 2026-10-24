import type { AdminClientDetailDto } from "@pilates/api-contracts";

const reservas = (count: number) =>
  count === 1 ? "su reserva futura" : `sus ${count} reservas futuras`;
const evaluaciones = (count: number) =>
  count === 1
    ? "su evaluación nutricional"
    : `sus ${count} evaluaciones nutricionales`;

// Follow-ups 66 and 101: one line per consequence that applies to this
// Client, then the two that always do.
export const describeClosureForAdministrator = (
  client: AdminClientDetailDto,
): string[] => {
  const { closure, subscription } = client;
  const cancelled = [
    ...(closure.futureBookingCount > 0
      ? [reservas(closure.futureBookingCount)]
      : []),
    ...(closure.upcomingEvaluationCount > 0
      ? [evaluaciones(closure.upcomingEvaluationCount)]
      : []),
  ];
  const plan = subscription.subscription;
  const left = plan?.remainingClassAllowance ?? 0;
  return [
    ...(cancelled.length === 0
      ? []
      : [`Se cancelan ${cancelled.join(" y ")}, sin descontar nada.`]),
    ...(closure.activeWaitlistEntryCount === 0
      ? []
      : [
          closure.activeWaitlistEntryCount === 1
            ? "Sale de 1 lista de espera."
            : `Sale de ${closure.activeWaitlistEntryCount} listas de espera.`,
        ]),
    ...(plan == null ||
    subscription.status === "none" ||
    subscription.status === "expired"
      ? []
      : [
          `Su plan ${plan.planName} termina hoy, sin reembolso${
            left === 0
              ? ""
              : left === 1
                ? "; pierde la clase que le queda"
                : `; pierde las ${left} clases que le quedan`
          }.`,
        ]),
    "Se cierra su sesión en todos sus dispositivos y su correo queda libre.",
    "Se borran su nombre, correo, teléfono y foto. Sus pagos y clases se conservan sin sus datos, para la contabilidad del estudio.",
  ];
};
