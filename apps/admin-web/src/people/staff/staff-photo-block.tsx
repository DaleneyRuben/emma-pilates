import type { StaffMemberDto } from "@pilates/api-contracts";
import { CircleAlert, Upload } from "lucide-react";
import { useRef } from "react";
import { StaffPhoto } from "../../components/staff-photo";
import { Button } from "../../components/ui/button";
import { staffPhotoAccept, useStaffPhoto } from "./use-staff-photo";

const busyLabels = {
  uploading: "Subiendo foto…",
  removing: "Quitando foto…",
} as const;

/**
 * FIX-041 (follow-ups 242 and 247, proposal A): the member panel opens with
 * her 96 px photo beside her name, «Cambiar foto», «Quitar foto» while a
 * photo is attached, and the file line. A deactivated account only shows it.
 */
export function StaffPhotoBlock({ member }: { member: StaffMemberDto }) {
  const input = useRef<HTMLInputElement>(null);
  const { photo, status, choose, remove } = useStaffPhoto(member);
  const editable = member.status !== "deactivated";
  const busy = status.kind === "uploading" || status.kind === "removing";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <StaffPhoto
          name={member.name}
          photo={status.kind === "removing" ? null : photo}
          src={status.kind === "uploading" ? status.previewUrl : undefined}
          size={96}
        >
          {status.kind === "uploading" ? (
            <span className="absolute inset-0 flex items-center justify-center bg-superficie/55">
              <span
                aria-hidden="true"
                className="size-6 animate-[spin_0.9s_linear_infinite] rounded-full border-[3px] border-primario/30 border-t-primario"
              />
            </span>
          ) : null}
        </StaffPhoto>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-serif text-[22px] leading-tight break-words text-texto">
            {member.name}
          </span>
          {editable ? (
            <>
              <input
                ref={input}
                type="file"
                accept={staffPhotoAccept}
                aria-label="Archivo de la foto"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file !== undefined) void choose(file);
                }}
              />
              {busy ? (
                <span
                  role="status"
                  className="inline-flex min-h-9 items-center text-nota text-texto-tenue"
                >
                  {busyLabels[status.kind]}
                </span>
              ) : (
                <span className="-ml-0.5 flex flex-wrap items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => input.current?.click()}
                  >
                    <Upload size={18} strokeWidth={1.8} aria-hidden="true" />
                    Cambiar foto
                  </Button>
                  {photo === null ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove()}
                    >
                      Quitar foto
                    </Button>
                  )}
                </span>
              )}
              <span className="text-ayuda text-texto-tenue">
                JPG, PNG o WebP, hasta 5 MB.
              </span>
            </>
          ) : null}
        </div>
      </div>
      {status.kind === "failed" ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-tarjeta bg-lino px-3.5 py-2.5 text-nota text-texto"
        >
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-error-tinte text-error">
            <CircleAlert size={20} strokeWidth={1.6} aria-hidden="true" />
          </span>
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
