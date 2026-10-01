import { Clock3 } from "lucide-react";
import { formatWait } from "./use-countdown";

// AW30: a device or network limit (BE-012) is a neutral pause, not an error;
// the wait is only what the server's Retry-After gave.
export function RequestLimitNotice({ seconds }: { seconds: number }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[10px] border border-borde-fuerte bg-rosa-empolvado/16 px-4 py-3.5"
    >
      <Clock3
        size={18}
        strokeWidth={1.4}
        className="mt-px flex-none text-primario"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-celda text-texto">
          Demasiadas solicitudes. Intenta de nuevo en un momento; si ya
          recibiste un enlace, sigue sirviendo.
        </span>
        <span className="tabular text-nota text-texto-secundario">
          Podrás pedirlo en {formatWait(seconds)}.
        </span>
      </div>
    </div>
  );
}
