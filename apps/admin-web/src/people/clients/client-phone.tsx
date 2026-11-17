import { cn } from "../../lib/cn";
import { isCompletePhone } from "../../lib/complete-phone";
import { phoneWithFlag } from "../../lib/phone-number";

/**
 * A Client's phone in the Clientes list and her file: «🇧🇴 +591 70711001», or
 * «Celular incompleto» when none or an unusable one is stored (finding 74).
 */
export function ClientPhone({
  phone,
  tone = "",
}: {
  phone: string | null;
  /** The colour of a complete phone; an incomplete one is always a warning. */
  tone?: string;
}) {
  if (phone === null || !isCompletePhone(phone)) {
    return <span className="text-advertencia-texto">Celular incompleto</span>;
  }
  return <span className={cn("tabular", tone)}>{phoneWithFlag(phone)}</span>;
}
