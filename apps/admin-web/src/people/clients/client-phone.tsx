import { cn } from "../../lib/cn";
import { isCompletePhone } from "../../lib/complete-phone";
import { phoneWithFlag } from "../../lib/phone-number";

/**
 * A Client's phone in the Clientes lists and her file: «🇧🇴 +591 70711001»,
 * «Celular incompleto» when an unusable one is stored (finding 74), or «Sin
 * teléfono» when none is (finding 114).
 */
export function ClientPhone({
  phone,
  tone = "",
}: {
  phone: string | null;
  /** The colour of a complete phone; an incomplete one is always a warning. */
  tone?: string;
}) {
  if (phone === null || phone.trim() === "") {
    return <span className="text-texto">Sin teléfono</span>;
  }
  if (!isCompletePhone(phone)) {
    return <span className="text-texto">Celular incompleto</span>;
  }
  return <span className={cn("tabular", tone)}>{phoneWithFlag(phone)}</span>;
}
