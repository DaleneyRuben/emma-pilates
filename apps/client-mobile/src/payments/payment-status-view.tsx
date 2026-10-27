import { colors, Glyph, radii, type GlyphName } from "@pilates/mobile-core";
import { View } from "react-native";

export type PaymentStatusState = "pending" | "confirmed" | "rejected";

const statuses: Record<PaymentStatusState, { disc: string; glyph: GlyphName; label: string }> = {
  pending: { disc: colors.warning, glyph: "hourglass", label: "Pago en revisión" },
  confirmed: { disc: colors.success, glyph: "check", label: "Pago confirmado" },
  rejected: { disc: colors.error, glyph: "cross", label: "Comprobante rechazado" },
};

/** The 72 pt semantic disc of screen 11, with its 26 pt white line icon (follow-up 111). */
export function PaymentStatusView({ state }: { state: PaymentStatusState }) {
  const status = statuses[state];
  return (
    <View
      accessibilityLabel={status.label}
      accessibilityRole="image"
      style={{
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: status.disc,
        borderRadius: radii.pill,
        justifyContent: "center",
        minHeight: 72,
        minWidth: 72,
        padding: 16,
      }}
      testID={`payment-status-disc-${state}`}
    >
      <Glyph
        color={colors.white}
        name={status.glyph}
        size={26}
        testID={`payment-status-icon-${state}`}
      />
    </View>
  );
}
