import {
  getGetCurrentClientPromotionsConsentQueryKey,
  setCurrentClientPromotionsConsent,
  useGetCurrentClientPromotionsConsent,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

const label = "Recibir promociones de Emma Pilates";
const saveFailed = "No pudimos guardar tu preferencia. Inténtalo de nuevo.";

// Follow-up 103 (ADR-0098): a live Client agrees to promotions, or stops,
// from Perfil. Each change saves at once; a failed one puts the switch back.
export function PromotionsSwitch() {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const consent = useGetCurrentClientPromotionsConsent({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [saving, setSaving] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  if (consent.data?.status !== 200) return null;
  const checked = saving ?? consent.data.data.consented;

  const toggle = async () => {
    const consented = !checked;
    setSaving(consented);
    setFailed(false);
    try {
      const response = await setCurrentClientPromotionsConsent(
        { consented },
        { headers: { "Content-Type": "application/json" } },
        fetcher,
      );
      if (response.status !== 200) throw new Error("promotions_consent_not_saved");
      queryClient.setQueryData(getGetCurrentClientPromotionsConsentQueryKey(), response);
    } catch {
      setFailed(true);
    } finally {
      setSaving(null);
    }
  };

  // C18b: one row of the Preferencias group, the legal line under the group.
  return (
    <>
      <View style={styles.hairline} />
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked, disabled: saving !== null }}
        disabled={saving !== null}
        onPress={() => void toggle()}
        style={[styles.row, saving !== null && styles.saving]}
        testID="profile-promotions-switch"
      >
        <View style={styles.disc}>
          <Glyph name="tag" size={18} strokeWidth={1.5} />
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Recibir promociones</Text>
          {failed ? <BodyText style={styles.error}>{saveFailed}</BodyText> : null}
        </View>
        <View style={[styles.track, checked && styles.trackOn]}>
          <View style={styles.knob} />
        </View>
      </Pressable>
    </>
  );
}

export const promotionsLegalLine =
  "Usamos tu nombre, correo y teléfono para enviarte ofertas del estudio.";

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  error: { color: colors.error, fontSize: typography.note },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  knob: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    elevation: 2,
    height: 27,
    shadowColor: colors.text,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    width: 27,
  },
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.bodyMedium },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  saving: { opacity: 0.6 },
  text: { flex: 1, gap: spacing.xs },
  track: {
    alignItems: "flex-start",
    backgroundColor: colors.hairline,
    borderRadius: radii.pill,
    height: 31,
    justifyContent: "center",
    padding: 2,
    width: 51,
  },
  trackOn: { alignItems: "flex-end", backgroundColor: colors.primary },
});
