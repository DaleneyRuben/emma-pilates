import { AlertCircle, Download, Maximize2, QrCode, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { BodyScrollLock } from "../../../components/ui/body-scroll-lock";
import { buttonVariants } from "../../../components/ui/button";
import { closeButtonClass } from "../../../components/ui/sheet";
import { StatusPill } from "../../../components/ui/status-pill";
import { formatCivilDate } from "../../../lib/bolivia-time";
import { cn } from "../../../lib/cn";

export type PayoutQrView =
  | {
      standing: "valid" | "expiring";
      validUntil: string;
      imageUrl: string;
    }
  | { standing: "expired"; validUntil: string; imageUrl: null };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const fileName = (name: string) =>
  `qr-cobro-${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

const actionClass =
  "inline-flex h-[44px] items-center gap-1.5 text-celda font-medium text-primario-profundo hover:text-primario-presionado";

function Notice({
  tone,
  title,
  children,
}: {
  tone: "neutral" | "error";
  title: string;
  children: string;
}) {
  const Icon = tone === "error" ? AlertCircle : QrCode;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-marco border border-dashed p-5 text-celda",
        tone === "error"
          ? "border-error/40 bg-error-tinte"
          : "border-borde-fuerte bg-lino",
      )}
    >
      <Icon
        size={28}
        strokeWidth={1.4}
        aria-hidden="true"
        className={tone === "error" ? "text-error" : "text-primario"}
      />
      <span
        className={cn("font-semibold", tone === "error" && "text-error-texto")}
      >
        {title}
      </span>
      <span>{children}</span>
    </div>
  );
}

// FIX-072, follow-up 276: a person's payout QR as the studio QR card draws it
// (follow-up 95: whole, Ampliar, Guardar QR), or why there is none to pay to.
// An expired QR is never drawn, so nobody transfers to a dead account.
export function PayoutQrCard({
  staffName,
  qr,
}: {
  staffName: string;
  qr: PayoutQrView | null;
}) {
  const [enlarged, setEnlarged] = useState(false);
  const name = firstName(staffName);
  const label = `QR de cobro de ${staffName}`;

  if (qr === null) {
    return (
      <Notice tone="neutral" title="Sin QR de cobro">
        {`${name} todavía no subió su QR de cobro. Pídele que lo suba en la app, en Perfil › Mi QR de cobro.`}
      </Notice>
    );
  }
  if (qr.standing === "expired") {
    return (
      <Notice tone="error" title="QR vencido · pídele uno nuevo">
        {`El QR de ${name} venció el ${formatCivilDate(qr.validUntil)}. No lo mostramos para que no le transfieras a una cuenta que ya no sirve.`}
      </Notice>
    );
  }

  const src = `${qr.imageUrl}?variant=readable`;
  const save = (
    <a href={src} download={fileName(staffName)} className={actionClass}>
      <Download size={16} strokeWidth={1.3} aria-hidden="true" />
      Guardar QR
    </a>
  );

  return (
    <div className="flex flex-col items-center gap-2.5 rounded-marco border border-borde-fuerte bg-blanco p-[22px] shadow-[0_2px_10px_rgba(74,58,48,0.06)]">
      <button
        type="button"
        onClick={() => setEnlarged(true)}
        className="cursor-zoom-in"
      >
        <img src={src} alt={label} className="size-[190px] object-contain" />
      </button>
      <div className="flex justify-center gap-6">
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className={actionClass}
        >
          <Maximize2 size={16} strokeWidth={1.3} aria-hidden="true" />
          Ampliar
        </button>
        {save}
      </div>
      <span className="flex flex-col items-center text-center text-nota text-texto-tenue">
        <span>{label}</span>
        <span>{`Vale hasta el ${formatCivilDate(qr.validUntil)}`}</span>
      </span>
      {qr.standing === "expiring" ? (
        <StatusPill tone="advertencia">Vence pronto</StatusPill>
      ) : null}
      <Dialog.Root open={enlarged} onOpenChange={setEnlarged}>
        <Dialog.Portal>
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col items-center gap-5 overflow-y-auto bg-superficie p-6 outline-none"
          >
            <BodyScrollLock />
            <div className="flex w-full items-center gap-3">
              <Dialog.Title className="flex-1 font-display text-titulo-panel">
                {label}
              </Dialog.Title>
              <Dialog.Close aria-label="Cerrar" className={closeButtonClass}>
                <X size={16} strokeWidth={1.6} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <img
              src={src}
              alt=""
              className="size-[min(520px,100%)] object-contain"
            />
            <span className="text-nota text-texto-tenue">
              {`Vale hasta el ${formatCivilDate(qr.validUntil)}`}
            </span>
            <a
              href={src}
              download={fileName(staffName)}
              className={buttonVariants({ variant: "primary" })}
            >
              <Download size={16} strokeWidth={1.6} aria-hidden="true" />
              Guardar QR
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
