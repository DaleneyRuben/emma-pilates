import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  PrimaryButton,
  ScreenHeader,
  shadows,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { Fragment, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { formatBolivianos } from "../plans/plan-format";

export type PaymentStatusState = "pending" | "confirmed" | "rejected";

type StatusPayment = {
  amountDueCentavos: number;
  classAllowance: number;
  planName: string;
  rejectionReason?: string | null;
};

function Facts({ rows }: { rows: readonly [string, string][] }) {
  return (
    <View style={styles.facts} testID="payment-status-facts">
      {rows.map(([label, value], index) => (
        <Fragment key={label}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/** The staff reason as its own sentence: a full stop when she left none (FIX-090). */
function sentence(text: string | null | undefined): string {
  const trimmed = text?.trim() ?? "";
  if (trimmed === "" || /[.!?…]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

type Action = { label: string; onPress: () => void; testID?: string };

/**
 * 11's three states (walkthrough n.º 15, Rosa Emma C11, C11b, C11c): the band
 * holds the line icon on a white disc and the Lora title; the owner's copy and
 * the Plan's facts are white cards; the buttons sit on the white footer.
 */
function StatusLayout({
  children,
  error,
  icon,
  note,
  primaryAction,
  textAction,
  title,
}: {
  children: ReactNode;
  error?: string | null;
  icon: GlyphName;
  note: string;
  primaryAction?: Action;
  textAction?: Action;
  title: string;
}) {
  return (
    <>
      <ScreenHeader>
        <View style={styles.disc} testID="payment-status-disc">
          <Glyph
            color={colors.text}
            name={icon}
            size={28}
            strokeWidth={1.6}
            testID={`payment-status-icon-${icon}`}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.noteCard}>
          <Text style={styles.note}>{note}</Text>
        </View>
        {children}
        {error === undefined || error === null ? null : (
          <View style={styles.errorBox}>
            <Glyph color={colors.errorText} name="alert" size={18} strokeWidth={1.7} />
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer} testID="payment-status-actions">
        {primaryAction === undefined ? null : <PrimaryButton {...primaryAction} />}
        {textAction === undefined ? null : <TextButton {...textAction} />}
      </View>
    </>
  );
}

export function PaymentStatusView({
  busy = false,
  endsOn,
  error,
  onHome,
  onPrimary,
  payment,
  state,
}: {
  busy?: boolean;
  /** The active Plan's end, once confirmed. */
  endsOn?: string;
  /** Why sending another receipt could not start. */
  error?: string | null;
  onHome: () => void;
  /** «Reservar una clase» once confirmed; «Subir otro comprobante» once rejected. */
  onPrimary?: () => void;
  payment: StatusPayment;
  state: PaymentStatusState;
}) {
  const amount = formatBolivianos(payment.amountDueCentavos);
  const home = { label: "Volver al inicio", onPress: onHome, testID: "payment-status-home" };

  if (state === "confirmed") {
    return (
      <StatusLayout
        error={error}
        icon="check"
        note="Tu plan ya está activo. Nos vemos pronto en el estudio."
        primaryAction={
          onPrimary === undefined ? undefined : { label: "Reservar una clase", onPress: onPrimary }
        }
        textAction={{ ...home, label: "Ir al inicio" }}
        title="¡Pago confirmado!"
      >
        <Facts
          rows={
            endsOn === undefined
              ? [["Plan", payment.planName]]
              : [
                  ["Plan", payment.planName],
                  ["Vence", formatCivilDate(endsOn)],
                ]
          }
        />
      </StatusLayout>
    );
  }

  if (state === "rejected") {
    const reason = sentence(payment.rejectionReason);
    return (
      <StatusLayout
        error={error}
        icon="alert"
        note={`${reason === "" ? "" : `${reason} `}Sube uno nuevo para activar tu plan.`}
        primaryAction={
          onPrimary === undefined
            ? undefined
            : { label: busy ? "Preparando…" : "Subir otro comprobante", onPress: onPrimary }
        }
        textAction={home}
        title="No pudimos confirmar tu pago"
      >
        <Facts
          rows={[
            ["Plan", payment.planName],
            ["Monto esperado", amount],
          ]}
        />
      </StatusLayout>
    );
  }

  return (
    <StatusLayout
      error={error}
      icon="hourglass"
      note="Nuestro equipo está revisando tu comprobante. Suele tomar unos minutos en horario de atención. Te avisaremos apenas esté listo."
      primaryAction={home}
      title="Tu pago está en revisión"
    >
      <Facts
        rows={[
          ["Plan", payment.planName],
          ["Monto", amount],
        ]}
      />
    </StatusLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  disc: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  error: {
    color: colors.errorText,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorSurface,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  facts: { ...surfaces.card, overflow: "hidden" },
  // A white panel from edge to edge with the card shadow cast upward.
  footer: {
    ...shadows.footer,
    backgroundColor: colors.card,
    gap: spacing.xs,
    marginHorizontal: -spacing.lg,
    paddingBottom: spacing.mdLg,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.mdLg,
  },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 14 },
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 21,
  },
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scroll: { flex: 1 },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.title,
    lineHeight: 33,
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "right",
  },
});
