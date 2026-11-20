import { Button } from "../ui/button";

/**
 * Design follow-up 105: the plain empty state with an action, drawn on
 * Superficie where a page failed while rendering (WEB-032). Only the content
 * area is replaced; the shell around it stays. The error itself reaches
 * error monitoring through React's root caught-error handler (EXT-011), so
 * nothing is reported here.
 */
export function PageRecoveryState({ reset }: { reset: () => void }) {
  return (
    <div
      role="alert"
      className="mt-5 flex flex-col items-center rounded-tarjeta bg-superficie px-6 py-8 text-center shadow-tarjeta"
    >
      <h1 className="tipo-titulo-fila text-texto">Algo salió mal</h1>
      <p className="mt-1 max-w-[480px] tipo-cuerpo text-texto">
        No pudimos mostrar esta página. Inténtalo de nuevo; si vuelve a pasar,
        recarga la página.
      </p>
      <Button size="lg" className="mt-4 min-w-[220px]" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
