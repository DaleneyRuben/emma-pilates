import type { ContactAlertItemDto } from "@pilates/api-contracts";
import { MessageSquare } from "lucide-react";
import { Button } from "../../components/ui/button";
import { isCompletePhone } from "../../lib/complete-phone";
import { useMarkClientContacted } from "./contact-alert-queries";
import { whatsAppHref } from "./contact-alert-copy";

export function ContactAlertActions({
  item,
  onMarked,
  onFailed,
}: {
  item: ContactAlertItemDto;
  onMarked: (name: string) => void;
  onFailed: (name: string) => void;
}) {
  const mark = useMarkClientContacted();
  // Walkthrough finding 114: WhatsApp opens only to a usable mobile.
  const href =
    item.phone !== null && isCompletePhone(item.phone)
      ? whatsAppHref(item.phone)
      : null;
  const missing =
    item.phone === null || item.phone.trim() === ""
      ? "Sin teléfono"
      : "Celular incompleto";

  return (
    <span className="flex justify-end gap-2 max-md:w-full">
      {href === null ? (
        <Button
          variant="neutral"
          size="sm"
          disabled
          title={missing}
          // FIX-088: quieter than the enabled one, never a grey block.
          className="max-md:flex-1 disabled:bg-transparent"
        >
          <MessageSquare size={14} strokeWidth={1.8} aria-hidden="true" />
          Abrir WhatsApp
        </Button>
      ) : (
        <Button asChild variant="neutral" size="sm" className="max-md:flex-1">
          <a href={href} target="_blank" rel="noreferrer">
            <MessageSquare size={14} strokeWidth={1.8} aria-hidden="true" />
            Abrir WhatsApp
          </a>
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="max-md:flex-1"
        busy={mark.isPending}
        onClick={() => {
          void mark
            .mutateAsync(item.clientId)
            .then(() => onMarked(item.name))
            .catch(() => onFailed(item.name));
        }}
      >
        Contactada
      </Button>
    </span>
  );
}
