import { formatWait } from "./use-countdown";

// Follow-up 37/38: neutral copy that never says the Account is locked, and
// only the remaining time the server's Retry-After gave.
export function ThrottledNotice({ seconds }: { seconds: number }) {
  return (
    <p role="alert" className="text-nota text-error-texto">
      Demasiados intentos. Intenta de nuevo en un momento.{" "}
      <span className="tabular">
        Podrás intentarlo en {formatWait(seconds)}.
      </span>
    </p>
  );
}
