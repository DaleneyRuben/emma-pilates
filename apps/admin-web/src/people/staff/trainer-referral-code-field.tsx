import { useId } from "react";
import { ExampleHint } from "../../components/form/example-hint";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { ReferralCodeDraft } from "./use-referral-code-draft";

// BKM-011 (follow-up 143): a Trainer's personal Referral Code on AW24.
// Enter submits the whole panel, as in any other field.
export function TrainerReferralCodeField({
  draft,
}: {
  draft: ReferralCodeDraft;
}) {
  const id = useId();
  if (draft.query.data === undefined) {
    return draft.query.isError ? (
      <p className="text-ayuda text-texto-tenue">
        No pudimos leer su código personal.
      </p>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Código personal</Label>
      <Input
        id={id}
        autoComplete="off"
        aria-invalid={draft.error !== null}
        aria-describedby={`${id}-help`}
        className="font-mono tracking-wider"
        value={draft.value}
        onChange={(event) => draft.change(event.target.value)}
      />
      <p id={`${id}-help`} className="text-ayuda text-texto-tenue">
        <ExampleHint example="CARLA">
          Las clientas que se registran con este código quedan como traídas por
          ella.
        </ExampleHint>
      </p>
      {draft.error === null ? null : (
        <p role="alert" className="text-ayuda text-error-texto">
          {draft.error}
        </p>
      )}
    </div>
  );
}
