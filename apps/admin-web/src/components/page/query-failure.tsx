import { Button } from "../ui/button";
import { isForbidden } from "./is-forbidden";

/**
 * A read that failed: a 403 means this Administrator can no longer act here
 * (ADR-0054 decides on current data), anything else may pass on a retry.
 */
export function QueryFailure({
  error,
  what,
  onRetry,
}: {
  error: unknown;
  /** Completes "No pudimos cargar …", e.g. "las sucursales". */
  what: string;
  onRetry: () => void;
}) {
  if (isForbidden(error)) {
    return (
      <p
        role="alert"
        className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario"
      >
        No tienes permiso para ver esta sección.
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center"
    >
      <p className="text-cuerpo text-texto-secundario">
        No pudimos cargar {what}.
      </p>
      <Button variant="neutral" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function LoadingNotice({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-tenue"
    >
      {children}
    </p>
  );
}
