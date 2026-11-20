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
      className="flex items-start gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-3.5 py-3"
    >
      <Clock3
        size={18}
        strokeWidth={1.4}
        className="mt-px flex-none text-texto"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <span className="tipo-cuerpo text-texto">{message}</span>
        <span className="tipo-secundario text-texto tabular">
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
