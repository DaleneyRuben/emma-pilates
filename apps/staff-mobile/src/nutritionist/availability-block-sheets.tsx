import { BodyText, ConfirmationSheet } from "@pilates/mobile-core";

import { civilDateLong } from "./nutritionist-format";
import { keptLine } from "./availability-block-form-parts";

export type Confirmation = "replace" | "end";

// «¿Aplicar el cambio?» / «¿Quitar este horario?» before a block with
// booked Evaluations is replaced or ended.
export function BlockChangeSheet({
  confirming,
  effectiveFrom,
  booked,
  busy,
  onApply,
  onRemove,
  onClose,
}: {
  confirming: Confirmation | null;
  effectiveFrom: string;
  booked: number;
  busy: boolean;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ending = confirming === "end";
  return (
    <ConfirmationSheet
      busy={busy}
      confirmLabel={ending ? "Quitar horario" : "Aplicar cambio"}
      note={`${ending ? "Quitar" : "Aplicar"} desde el ${civilDateLong(effectiveFrom)}.`}
      onConfirm={ending ? onRemove : onApply}
      onDismiss={onClose}
      testID="block-change-sheet"
      title={ending ? "¿Quitar este horario?" : "¿Aplicar el cambio?"}
      tone={ending ? "destructive" : "primary"}
      visible={confirming !== null}
    >
      {booked > 0 ? <BodyText>{keptLine(booked)}</BodyText> : null}
    </ConfirmationSheet>
  );
}
