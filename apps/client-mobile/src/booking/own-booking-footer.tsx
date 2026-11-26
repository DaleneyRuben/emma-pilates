import { cancelBooking, type SessionOwnBookingDto } from "@pilates/api-contracts";
import {
  ConfirmationSheet,
  formatCancellationDeadline,
  formatStartTime,
  InlineError,
  PrimaryButton,
  spacing,
  Text,
  TextButton,
  useMountedAt,
} from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { bookingRejectionMessage, problemCode } from "./booking-rejection-copy";

/** Why Reservar is off while she holds another class at that time (C04q). */
export const overlappingReason = (booking: SessionOwnBookingDto) =>
  `Ya tienes ${booking.classTypeName} a las ${formatStartTime(booking.startsAt)} ese día. Cancélala antes si prefieres esta.`;

/**
 * Walkthrough n.º 1 (C04p, C04q): the class detail's footer when she already
 * booked this class, or holds another one at that time.
 */
export function OwnBookingFooter({
  booking,
  cancellationWindowMinutes,
  onCancelled,
  onOpenBooking,
}: {
  booking: SessionOwnBookingDto;
  cancellationWindowMinutes: number | undefined;
  onCancelled: () => Promise<unknown>;
  onOpenBooking: () => void;
}) {
  if (booking.relation === "overlapping") {
    return (
      <>
        <PrimaryButton
          disabled
          disabledReason={overlappingReason(booking)}
          label="Reservar esta clase"
        />
        <TextButton label="Ver esa reserva" onPress={onOpenBooking} testID="session-own-booking" />
      </>
    );
  }
  return (
    <BookedFooter
      booking={booking}
      cancellationWindowMinutes={cancellationWindowMinutes}
      onCancelled={onCancelled}
    />
  );
}

function BookedFooter({
  booking,
  cancellationWindowMinutes,
  onCancelled,
}: {
  booking: SessionOwnBookingDto;
  cancellationWindowMinutes: number | undefined;
  onCancelled: () => Promise<unknown>;
}) {
  const fetcher = useClientFetcher();
  const mountedAt = useMountedAt();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const deadline =
    cancellationWindowMinutes === undefined
      ? null
      : new Date(new Date(booking.startsAt).getTime() - cancellationWindowMinutes * 60_000);
  const freeLine =
    deadline === null || deadline.getTime() <= mountedAt
      ? null
      : `Cancelas gratis hasta ${formatCancellationDeadline(deadline, new Date(mountedAt))}`;

  const cancel = async () => {
    setConfirming(false);
    setBusy(true);
    setFailure(null);
    try {
      const response = await cancelBooking(booking.bookingId, undefined, fetcher);
      if (response.status === 204) {
        await onCancelled();
        return;
      }
      setFailure(
        bookingRejectionMessage(problemCode(response.data)) ??
          "No pudimos cancelar la reserva. Inténtalo de nuevo.",
      );
    } catch {
      setFailure("No pudimos cancelar la reserva. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={styles.status} variant="titulo-fila">
        Ya reservaste esta clase
      </Text>
      <PrimaryButton
        busy={busy}
        label="Cancelar reserva"
        onPress={() => setConfirming(true)}
        testID="session-cancel"
        tone="error"
      />
      {freeLine === null ? null : (
        <Text style={styles.centered} variant="secundario">
          {freeLine}
        </Text>
      )}
      {failure === null ? null : <InlineError style={styles.centered}>{failure}</InlineError>}
      <ConfirmationSheet
        confirmLabel="Sí, cancelar reserva"
        confirmTestID="session-cancel-confirm"
        onConfirm={() => {
          if (!busy) void cancel();
        }}
        onDismiss={() => setConfirming(false)}
        testID="session-cancel-sheet"
        title="¿Cancelar esta reserva?"
        visible={confirming}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
  status: { paddingVertical: spacing.sm, textAlign: "center" },
});
