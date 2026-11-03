import {
  getGetOwnReferralCodeQueryKey,
  useChangeOwnReferralCode,
  useGetOwnReferralCode,
} from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ConfirmationSheet } from "../ui/confirmation-sheet";
import { fontFamilies } from "../ui/fonts";
import { useMountedAt } from "../time/mounted-at";
import { Glyph } from "../ui/glyph";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, surfaces, typography } from "../ui/tokens";
import { type CodeStatus, ReferralCodeSheet } from "./referral-code-sheet";

const editableFromFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
});

// The API's refusals of a save (BKM-017), shown on the sheet's status line.
const refusals: Record<string, CodeStatus> = {
  referral_code_blocked: "blocked",
  referral_code_change_too_soon: "too_soon",
  referral_code_in_use: "in_use",
  referral_code_malformed: "malformed",
};

type ReferralCodeCardProps = { code: string; onCopied: () => void };

/** C16 / S30: the code on the screen's emphasis card, with «Copiar». */
export function ReferralCodeCard({ code, onCopied }: ReferralCodeCardProps) {
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    onCopied();
  };
  return (
    <View style={styles.card}>
      <View style={styles.codeColumn}>
        <Text style={styles.eyebrow}>Tu código</Text>
        <Text selectable style={styles.code}>
          {code}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Copiar"
        accessibilityRole="button"
        onPress={() => void copy()}
        style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
      >
        <Glyph color={colors.emphasis} name="copy" size={16} strokeWidth={1.6} />
        <Text style={styles.copyLabel}>Copiar</Text>
      </Pressable>
    </View>
  );
}

type EditReferralCodeProps = {
  fetcher: typeof fetch;
  /** The new code is saved: the screen shows «Código actualizado» and reloads. */
  onChanged: (code: string) => void;
};

type Step = "closed" | "confirming" | "editing";

/**
 * C16 / S30's «Editar código», its sheet and its confirmation (follow-ups 228
 * and 229). Inside the 30 days it shows when she can change the code again.
 */
export function EditReferralCode({ fetcher, onChanged }: EditReferralCodeProps) {
  const queryClient = useQueryClient();
  const own = useGetOwnReferralCode({ fetcher });
  const change = useChangeOwnReferralCode({ fetcher });
  const [step, setStep] = useState<Step>("closed");
  const [code, setCode] = useState("");
  const [refusal, setRefusal] = useState<CodeStatus | null>(null);
  const mountedAt = useMountedAt();

  if (own.data?.status !== 200) return null;
  const { editableFrom, referralCode: current } = own.data.data;
  if (current === null) return null;
  if (editableFrom !== null && new Date(editableFrom).getTime() > mountedAt) {
    return (
      <Text style={styles.waitLine}>
        Podrás cambiarlo de nuevo el {editableFromFormatter.format(new Date(editableFrom))}
      </Text>
    );
  }

  const open = () => {
    setCode(current);
    setRefusal(null);
    setStep("editing");
  };
  const save = () => {
    change.mutate(
      { data: { referralCode: code } },
      {
        onSettled: (response) => {
          if (response?.status === 200) {
            queryClient.setQueryData(getGetOwnReferralCodeQueryKey(), response);
            setStep("closed");
            onChanged(response.data.referralCode ?? code);
            return;
          }
          const problem = (response?.data ?? {}) as { code?: string };
          // A network failure or an unexpected answer can be tried again.
          setRefusal(refusals[problem.code ?? ""] ?? "failed");
          setStep("editing");
        },
      },
    );
  };

  return (
    <>
      <TextButton label="Editar código" onPress={open} style={styles.edit} />
      <ReferralCodeSheet
        code={code}
        fetcher={fetcher}
        onChangeCode={(next) => {
          setRefusal(null);
          setCode(next);
        }}
        onDismiss={() => setStep("closed")}
        onSave={() => setStep("confirming")}
        refusal={refusal}
        visible={step === "editing"}
      />
      <ConfirmationSheet
        busy={change.isPending}
        confirmLabel="Cambiar código"
        note={`Tu código anterior ${current} dejará de funcionar. Las amigas que ya se registraron con él siguen contando para ti.`}
        onConfirm={save}
        onDismiss={() => setStep("editing")}
        title={`¿Cambiar tu código a ${code}?`}
        tone="primary"
        visible={step === "confirming"}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.emphasis,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.xlSm,
    paddingRight: spacing.lg,
    paddingTop: spacing.lg,
  },
  code: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    letterSpacing: 3.8,
    lineHeight: 36,
  },
  codeColumn: { flex: 1, gap: spacing.xs },
  copy: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  copyLabel: {
    color: colors.emphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  edit: { alignSelf: "flex-start", paddingHorizontal: 0 },
  eyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  pressed: { opacity: 0.85 },
  waitLine: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
});
