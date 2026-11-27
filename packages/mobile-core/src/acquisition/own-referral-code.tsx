import {
  formatListDate,
  getGetOwnReferralCodeQueryKey,
  useChangeOwnReferralCode,
  useGetOwnReferralCode,
} from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { useMountedAt } from "../time/mounted-at";
import { Text } from "../ui/text";
import { TextButton } from "../ui/text-button";
import { spacing } from "../ui/tokens";
import { type CodeStatus, ReferralCodeSheet } from "./referral-code-sheet";

// The API's refusals of a save (BKM-017), shown on the sheet's status line.
const refusals: Record<string, CodeStatus> = {
  referral_code_blocked: "blocked",
  referral_code_change_too_soon: "too_soon",
  referral_code_in_use: "in_use",
  referral_code_malformed: "malformed",
};

type EditReferralCodeProps = {
  fetcher: typeof fetch;
  /** On the 600 hero card (E-F13): the link and the wait line in white. */
  onDark?: boolean;
  /** The new code is saved: the screen shows «Código actualizado» and reloads. */
  onChanged: (code: string) => void;
};

type Step = "closed" | "confirming" | "editing";

/**
 * C16 / S30's «Editar código», its sheet and its confirmation (follow-ups 228
 * and 229). Inside the 30 days it shows when she can change the code again.
 */
export function EditReferralCode({ fetcher, onChanged, onDark = false }: EditReferralCodeProps) {
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
      <Text style={styles.waitLine} tone={onDark ? "onDark" : "ink"} variant="secundario">
        Podrás cambiarlo de nuevo el {formatListDate(editableFrom)}
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
    // E-F13: each app sets «Editar código» on its own white card.
    <>
      <TextButton
        label="Editar código"
        onPress={open}
        style={styles.edit}
        tone={onDark ? "onDark" : "ink"}
      />
      <ReferralCodeSheet
        code={code}
        confirmation={
          step === "confirming"
            ? {
                busy: change.isPending,
                current,
                onBack: () => setStep("editing"),
                onConfirm: save,
              }
            : null
        }
        fetcher={fetcher}
        onChangeCode={(next) => {
          setRefusal(null);
          setCode(next);
        }}
        onDismiss={() => setStep("closed")}
        onSave={() => setStep("confirming")}
        refusal={refusal}
        visible={step !== "closed"}
      />
    </>
  );
}

const styles = StyleSheet.create({
  edit: { alignSelf: "flex-start", minHeight: 40, paddingHorizontal: 0 },
  waitLine: { paddingVertical: spacing.sm },
});
