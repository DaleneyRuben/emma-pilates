import { formatListDate } from "@pilates/api-contracts";
import type { OwnSalaryPaymentDto } from "@pilates/api-contracts";
import {
  colors,
  FullScreenImage,
  InlineError,
  loadPrivateImageWithRatio,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

// The receipt is a private, authenticated image read through her own route
// (BKO-008); the thumbnail fits a row, `readable` the full screen.
// A failed receipt is never refetched on its own (focus, reconnect): it
// would open full screen without a tap. Only a second tap retries it.
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
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function ReceiptThumbnail({ size = 40, url }: { size?: number; url: string }) {
  const image = useReceiptImage(url, "thumbnail");
  const box = { borderRadius: 10, height: size, width: size };
  return image.data === undefined ? (
    <View style={[box, styles.pending]} />
  ) : (
    <Image source={{ uri: image.data.uri }} style={[box, styles.image]} />
  );
}

/**
 * Opens a payment's receipt full screen. `error` says so in place when it
 * cannot load; a second tap on the same payment asks for it again.
 */
export function useReceiptViewer() {
  const [open, setOpen] = useState<OwnSalaryPaymentDto | null>(null);
  const full = useReceiptImage(open?.receiptUrl ?? null, "readable");
  const failed = open !== null && full.isError;

  const show = (payment: OwnSalaryPaymentDto) => {
    if (open?.id === payment.id && full.isError) void full.refetch();
    setOpen(payment);
  };
  const error = failed ? (
    // It stands between cards on the 100 screen, so it goes in a white card (rule 3).
    <View style={styles.error}>
      <InlineError>No pudimos mostrar el comprobante.</InlineError>
    </View>
  ) : null;
  const viewer = (
    <FullScreenImage
      aspectRatio={full.data?.aspectRatio ?? 1}
      label="Comprobante del pago"
      onClose={() => setOpen(null)}
      title={open === null ? undefined : `Pago del ${formatListDate(open.paidOn)}`}
      uri={full.data?.uri ?? null}
      visible={open !== null && !failed}
    />
  );
  return { error, show, viewer };
}

const styles = StyleSheet.create({
  error: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  image: { borderColor: colors.hairline, borderWidth: 1 },
  pending: { backgroundColor: colors.neutralTint },
});
