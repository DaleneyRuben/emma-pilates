import {
  getGetStaffMemberReferralCodeQueryKey,
  getStaffMemberReferralCode,
  setStaffMemberReferralCode,
  type TrainerReferralCodeDto,
} from "@pilates/api-contracts";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";

const referralCodeQueryOptions = (staffMemberId: string) =>
  queryOptions({
    queryKey: getGetStaffMemberReferralCodeQueryKey(staffMemberId),
    queryFn: async ({ signal }) =>
      (await getStaffMemberReferralCode(staffMemberId, { signal }, adminFetch))
        .data as TrainerReferralCodeDto,
  });

const refusals: Record<string, string> = {
  referral_code_in_use: "Ese código ya lo tiene otra clienta o instructora.",
  referral_code_blocked: "Ese código no está permitido.",
  referral_code_malformed: "Usa de 3 a 20 letras, números o guiones.",
  staff_member_not_trainer: "Solo una instructora tiene código personal.",
};

const failureMessage = (error: unknown): string =>
  (isApiError(error) ? refusals[error.code] : undefined) ??
  "No pudimos guardar el código. Inténtalo de nuevo.";

/**
 * FIX-091 (W14 A): the code is a draft of the panel's form, saved by its
 * one «Guardar cambios» only when it changed; a refusal stays under it.
 */
export function useReferralCodeDraft(staffMemberId: string, trainer: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...referralCodeQueryOptions(staffMemberId),
    enabled: trainer,
  });
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = query.data?.referralCode ?? null;
  const value = typed ?? current ?? "";
  const next = value.trim() === "" ? null : value.trim();
  const changed = trainer && query.data !== undefined && next !== current;

  /** Saves a changed code; false when refused (the reason shows). */
  const save = async (): Promise<boolean> => {
    if (!changed) return true;
    setError(null);
    try {
      const saved = (
        await setStaffMemberReferralCode(
          staffMemberId,
          { referralCode: next },
          undefined,
          adminFetch,
        )
      ).data as TrainerReferralCodeDto;
      queryClient.setQueryData(
        getGetStaffMemberReferralCodeQueryKey(staffMemberId),
        saved,
      );
      setTyped(null);
      return true;
    } catch (failure) {
      setError(failureMessage(failure));
      return false;
    }
  };

  return {
    query,
    value,
    error,
    changed,
    save,
    change: (text: string) => {
      setTyped(text);
      setError(null);
    },
  };
}

export type ReferralCodeDraft = ReturnType<typeof useReferralCodeDraft>;
