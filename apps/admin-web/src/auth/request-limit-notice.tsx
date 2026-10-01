import { Clock3 } from "lucide-react";
import { formatWait } from "./use-countdown";

/**
 * A server limit drawn as a neutral pause, not an error, with only the wait
 * the server's Retry-After gave (AW30, AW24).
 */
export function WaitNotice({
  message,
  seconds,
  waitLabel,
}: {
  message: string;
  seconds: number;
  /** The start of the countdown line, such as «Podrás pedirlo en». */
  waitLabel: string;
}) {
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
        <span className="text-celda text-texto">{message}</span>
        <span className="tabular text-nota text-texto-secundario">
          {`${waitLabel} ${formatWait(seconds)}.`}
        </span>
      </div>
    </div>
  );
}

// AW30: a device or network limit (BE-012).
export function RequestLimitNotice({ seconds }: { seconds: number }) {
  return (
    <WaitNotice
      message="Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo."
      seconds={seconds}
      waitLabel="Podrás pedirlo en"
    />
  );
}
