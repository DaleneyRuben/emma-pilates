import {
  getGetStaffMemberReferralCodeQueryKey,
  getStaffMemberReferralCode,
  setStaffMemberReferralCode,
  type TrainerReferralCodeDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useId, useState, type KeyboardEvent } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const referralCodeQueryOptions = (staffMemberId: string) =>
  queryOptions({
    queryKey: getGetStaffMemberReferralCodeQueryKey(staffMemberId),
    queryFn: async ({ signal }) =>
      (await getStaffMemberReferralCode(staffMemberId, { signal }, adminFetch))
        .data as TrainerReferralCodeDto,
  });

const refusals: Record<string, string> = {
  referral_code_in_use: "Ese código ya lo tiene otra clienta o instructora.",
  referral_code_malformed:
    "Usa de 3 a 20 letras, números o guiones, sin empezar con REF-.",
  staff_member_not_trainer: "Solo una entrenadora tiene código personal.",
};

const failureMessage = (error: unknown): string =>
  (isApiError(error) ? refusals[error.code] : undefined) ??
  "No pudimos guardar el código. Inténtalo de nuevo.";

function CodeEditor({ current }: { current: TrainerReferralCodeDto }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [code, setCode] = useState(current.referralCode ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async (referralCode: string | null) =>
      (
        await setStaffMemberReferralCode(
          current.staffMemberId,
          { referralCode },
          undefined,
          adminFetch,
        )
      ).data as TrainerReferralCodeDto,
    onSuccess: (saved) => {
      queryClient.setQueryData(
        getGetStaffMemberReferralCodeQueryKey(saved.staffMemberId),
        saved,
      );
      setCode(saved.referralCode ?? "");
      setNotice(
        saved.referralCode === null
          ? "Quitamos el código."
          : `Código guardado: ${saved.referralCode}.`,
      );
    },
  });

  const submit = () => {
    setNotice(null);
    const trimmed = code.trim();
    save.mutate(trimmed === "" ? null : trimmed);
  };
  // The field sits inside the Role form; Enter saves the code, not the Role.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Código personal</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          autoComplete="off"
          aria-invalid={save.isError}
          className="font-mono tracking-wider"
          placeholder="Ej. CARLA"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setNotice(null);
          }}
          onKeyDown={onKeyDown}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-[44px]"
          busy={save.isPending}
          onClick={submit}
        >
          Guardar código
        </Button>
      </div>
      {save.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          {failureMessage(save.error)}
        </p>
      ) : notice === null ? (
        <p className="text-ayuda text-texto-tenue">
          Las clientas que se registran con este código quedan como traídas por
          ella.
        </p>
      ) : (
        <p role="status" className="text-ayuda text-exito-texto">
          {notice}
        </p>
      )}
    </div>
  );
}

// BKM-011 (follow-up 143): a Trainer's personal Referral Code on AW24.
export function TrainerReferralCodeField({
  staffMemberId,
}: {
  staffMemberId: string;
}) {
  const query = useQuery(referralCodeQueryOptions(staffMemberId));
  if (query.data === undefined) {
    return query.isError ? (
      <p className="text-ayuda text-texto-tenue">
        No pudimos leer su código personal.
      </p>
    ) : null;
  }
  return <CodeEditor current={query.data} />;
}
