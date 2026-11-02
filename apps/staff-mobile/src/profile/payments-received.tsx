import type { OwnSalaryPaymentDto } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  fontFamilies,
  FullScreenImage,
  loadPrivateImageWithRatio,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../assistant/assistant-format";
import { useStaffFetcher } from "../staff-fetcher";
import { formatExactBolivianos } from "../ui/exact-bolivianos";

// The receipt is a private, authenticated image read through her own route
// (BKO-008); the thumbnail fits the row, `readable` the full screen.
function useReceiptImage(url: string | null, variant: "thumbnail" | "readable") {
  const fetcher = useStaffFetcher();
  return useQuery({
    queryKey: ["salary-receipt", url, variant],
    queryFn: async () => {
      const loaded = await loadPrivateImageWithRatio(fetcher, `${url}?variant=${variant}`);
      if (loaded === null) throw new Error("The receipt could not be loaded");
      return loaded;
    },
    enabled: url !== null,
    retry: false,
  });
}

function Thumbnail({ url }: { url: string }) {
  const image = useReceiptImage(url, "thumbnail");
  return image.data === undefined ? (
    <View style={[styles.thumbnail, styles.thumbnailPending]} />
  ) : (
    <Image source={{ uri: image.data.uri }} style={styles.thumbnail} />
  );
}

function PaymentText({ payment }: { payment: OwnSalaryPaymentDto }) {
  const receipt = (payment.receiptUrl ?? null) === null ? "sin comprobante" : "ver comprobante";
  return (
    <View style={styles.paymentBody}>
      <Text style={styles.amount}>{formatExactBolivianos(payment.amountCentavos)}</Text>
      <Text style={styles.date}>{`${formatCivilDate(payment.paidOn)} · ${receipt}`}</Text>
    </View>
  );
}

// S29 «Pagos recibidos»: what Nómina recorded for her, newest first. A row
// with a receipt opens it full screen; one without says so and is inert.
export function PaymentsReceived({ payments }: { payments: OwnSalaryPaymentDto[] }) {
  const [open, setOpen] = useState<OwnSalaryPaymentDto | null>(null);
  const full = useReceiptImage(open?.receiptUrl ?? null, "readable");
  const failed = open !== null && full.isError;

  return (
    <View accessibilityLabel="Pagos recibidos" style={styles.section}>
      <SectionTitle>Pagos recibidos</SectionTitle>
      <View style={styles.paymentGroup}>
        {payments.map((payment, index) => {
          const divider = index > 0 && styles.paymentDivider;
          const receiptUrl = payment.receiptUrl ?? null;
          if (receiptUrl === null) {
            return (
              <View key={payment.id} style={[styles.payment, divider]}>
                <View style={[styles.thumbnail, styles.thumbnailEmpty]} />
                <PaymentText payment={payment} />
              </View>
            );
          }
          return (
            <Pressable
              accessibilityLabel={`Ver el comprobante del pago del ${formatCivilDate(payment.paidOn)}`}
              accessibilityRole="button"
              key={payment.id}
              onPress={() => {
                // A second tap on the receipt that failed asks for it again.
                if (open?.id === payment.id && full.isError) void full.refetch();
                setOpen(payment);
              }}
              style={({ pressed }) => [styles.payment, divider, pressed && styles.pressed]}
            >
              <Thumbnail url={receiptUrl} />
              <PaymentText payment={payment} />
              <Chevron size={16} strokeWidth={1.5} tone="muted" />
            </Pressable>
          );
        })}
      </View>
      {failed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          No pudimos mostrar el comprobante.
        </Text>
      ) : null}
      <FullScreenImage
        aspectRatio={full.data?.aspectRatio ?? 1}
        label="Comprobante del pago"
        onClose={() => setOpen(null)}
        title={open === null ? undefined : `Pago del ${formatCivilDate(open.paidOn)}`}
        uri={full.data?.uri ?? null}
        visible={open !== null && !failed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  date: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  error: { color: colors.errorText, fontFamily: fontFamilies.body, fontSize: typography.note },
  payment: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paymentBody: { flex: 1, gap: 2 },
  paymentDivider: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  paymentGroup: { ...surfaces.flatCard, overflow: "hidden" },
  pressed: { backgroundColor: colors.background },
  section: {},
  thumbnail: { borderRadius: 18, height: 36, width: 36 },
  thumbnailEmpty: { backgroundColor: colors.primaryTint },
  thumbnailPending: { backgroundColor: colors.neutralTint },
});
