import type {
  StaffMemberDto,
  StaffPendingEmailDto,
} from "@pilates/api-contracts";
import { Hourglass } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import {
  boliviaParts,
  formatDayMonth,
  formatWeekdayDay,
} from "../../lib/bolivia-time";
import { isApiError } from "../../api/problem";
import type { StaffFormInput, StaffFormOutput } from "./staff-form-schema";
import { isAccountEmailLimit, staffProblem } from "./staff-problems";
import { firstName, sameEmail } from "./staff-format";
import { useStaffChange } from "./staff-queries";
import type { EmailLimit } from "./use-email-limit";

// FIX-039 (DES-012, proposal A «Campo y confirmar al guardar», owner
// 2026-11-06): an active member's login email is a field; a new address is
// confirmed in a dialog on «Guardar», a link goes to it and a notice to the
// current one, and the login changes only when the link is opened.

/** «vie 6 de noviembre a las 11:40», in La Paz. */
const linkDeadline = (instant: string): string => {
  const { date, time } = boliviaParts(instant);
  const weekday = formatWeekdayDay(date).split(" ")[0] ?? "";
  return `${weekday} ${formatDayMonth(date)} a las ${time}`;
};

export function ActiveEmailField({
  control,
  current,
  name,
  typed,
}: {
  control: Control<StaffFormInput, unknown, StaffFormOutput>;
  current: string;
  name: string;
  typed: string;
}) {
  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Correo electrónico</FormLabel>
          <FormControl>
            <Input type="email" autoComplete="off" {...field} />
          </FormControl>
          {sameEmail(typed, current) ? null : (
            <p className="text-ayuda text-texto-tenue">
              {`Al guardar, le enviamos un enlace a este correo. Cambia cuando ${firstName(name)} lo abra.`}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function EmailChangeDialog({
  busy,
  member,
  newEmail,
  onConfirm,
  onOpenChange,
  open,
}: {
  busy: boolean;
  member: StaffMemberDto;
  newEmail: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const first = firstName(member.name);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`¿Cambiar el correo de ${first}?`}
      confirmLabel="Enviar enlace"
      tone="primary"
      busy={busy}
      onConfirm={onConfirm}
    >
      <p>
        {`Le enviaremos un enlace a ${newEmail}. El correo cambia cuando ${first} lo abra; hasta entonces sigue entrando con ${member.email}.`}
      </p>
      <p>{`También le avisamos a ${member.email}.`}</p>
    </ConfirmDialog>
  );
}

type Result = { ok: boolean; message: string };

/** The change waiting for the new address, with its two actions. */
export function PendingEmailChange({
  limit,
  member,
  onCancelled,
  onResent,
  pending,
}: {
  limit: EmailLimit;
  member: StaffMemberDto;
  onCancelled: () => void;
  onResent: (pending: StaffPendingEmailDto | null) => void;
  pending: StaffPendingEmailDto;
}) {
  const change = useStaffChange();
  const [result, setResult] = useState<Result | null>(null);
  const title = `Esperando que ${firstName(member.name)} confirme`;
  const waiting = limit.seconds > 0;

  const run = async (kind: "resendEmailChange" | "cancelEmailChange") => {
    setResult(null);
    try {
      const updated = await change.mutateAsync({
        kind,
        staffMemberId: member.id,
      });
      if (kind === "cancelEmailChange") {
        onCancelled();
        return;
      }
      onResent(updated.pendingEmail);
      setResult({
        ok: true,
        message: "Enviamos otro enlace. Solo sirve el más reciente.",
      });
    } catch (error) {
      if (isAccountEmailLimit(error)) {
        limit.start("account", error.problem.retryAfterSeconds ?? 0);
        return;
      }
      if (isApiError(error) && error.code === "email_throttled") {
        limit.start("recipient", error.problem.retryAfterSeconds ?? 0);
        return;
      }
      setResult({ ok: false, message: staffProblem(error).message });
    }
  };

  return (
    <section
      role="status"
      aria-label={title}
      className="flex gap-3 rounded-marco bg-rosa-tinte p-4"
    >
      <Hourglass
        size={20}
        strokeWidth={1.6}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-primario"
      />
      <div className="flex min-w-0 flex-col gap-1.5 text-nota text-texto">
        <p className="font-semibold">{title}</p>
        <p className="break-words">
          {`Enviamos un enlace a ${pending.email}. Hasta que lo abra, sigue entrando con ${member.email}.`}
        </p>
        <p className="text-ayuda text-texto-secundario">
          {`El enlace vence el ${linkDeadline(pending.expiresAt)}.`}
        </p>
        {result === null ? null : (
          <p
            role={result.ok ? undefined : "alert"}
            className={
              result.ok
                ? "text-ayuda text-primario"
                : "text-ayuda text-error-texto"
            }
          >
            {result.message}
          </p>
        )}
        <div className="-ml-2 flex flex-wrap gap-1">
          <Button
            variant="link"
            size="sm"
            disabled={change.isPending || waiting}
            busy={
              change.isPending && change.variables?.kind === "resendEmailChange"
            }
            onClick={() => void run("resendEmailChange")}
          >
            Reenviar enlace
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-error hover:text-error-texto"
            disabled={change.isPending}
            busy={
              change.isPending && change.variables?.kind === "cancelEmailChange"
            }
            onClick={() => void run("cancelEmailChange")}
          >
            Cancelar cambio
          </Button>
        </div>
      </div>
    </section>
  );
}
