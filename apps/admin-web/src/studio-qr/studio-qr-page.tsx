import { formatListDate } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { InlineError } from "../components/ui/inline-error";
import { boliviaParts } from "../lib/bolivia-time";
import {
  acceptedQrTypes,
  qrUploadMessage,
  studioQrImageQueryOptions,
  studioQrStatusQueryOptions,
  useStudioQrUpload,
} from "./studio-qr-queries";

const updatedLine = (updatedAt: string | null): string =>
  updatedAt === null
    ? "Es el QR de prueba del servidor"
    : `Actualizado el ${formatListDate(boliviaParts(updatedAt).date)}`;

function QrImage() {
  const image = useQuery(studioQrImageQueryOptions());

  return (
    <div className="flex size-[220px] shrink-0 items-center justify-center overflow-hidden rounded-marco bg-superficie text-texto">
      {image.data !== undefined ? (
        <img
          src={image.data}
          alt="QR de transferencia del estudio"
          className="size-full object-contain"
        />
      ) : image.isError ? (
        <p className="px-4 text-center tipo-cuerpo text-texto">
          No pudimos mostrar el QR.
        </p>
      ) : (
        <QrCode size={120} strokeWidth={1} aria-hidden="true" />
      )}
    </div>
  );
}

// WEB-038 «Ajustes › QR del estudio» (P09, tab qr): the Administrator sees the
// QR the apps show at checkout and replaces it with the bank's new one. The
// apps read it on their next checkout, without a restart or a build.
export function StudioQrPage() {
  const status = useQuery(studioQrStatusQueryOptions());
  const upload = useStudioQrUpload();
  const [uploaded, setUploaded] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const choose = (file: File) => {
    setUploaded(false);
    upload.mutate(file, { onSuccess: () => setUploaded(true) });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="QR del estudio"
        subtitle="El QR de transferencia que ven las clientas."
      />
      {uploaded ? (
        <PageNotice>Subimos el QR nuevo. La app ya lo muestra.</PageNotice>
      ) : null}
      {status.isError ? (
        <QueryFailure
          error={status.error}
          what="el QR del estudio"
          onRetry={() => void status.refetch()}
        />
      ) : (
        <section
          aria-labelledby={titleId}
          className="flex max-w-[1000px] flex-wrap items-center gap-5 rounded-tarjeta bg-superficie shadow-tarjeta p-6 max-md:p-4"
        >
          <QrImage />
          <div className="flex min-w-[200px] flex-1 flex-col items-start gap-2.5">
            <h2 id={titleId} className="tipo-titulo-seccion text-texto">
              QR de transferencia
            </h2>
            <p className="tipo-cuerpo text-texto">
              Es el QR que ven las clientas al pagar desde la app. Al subir uno
              nuevo, la app lo usa al instante.
            </p>
            {/* Follow-up 285 (rule 5): the Button shows the upload as busy
                instead of dimming its label; it opens the hidden picker. */}
            <input
              ref={picker}
              type="file"
              aria-label="Subir un QR nuevo"
              tabIndex={-1}
              accept={acceptedQrTypes.join(",")}
              className="sr-only"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file !== undefined) choose(file);
              }}
            />
            <Button
              busy={upload.isPending}
              onClick={() => picker.current?.click()}
            >
              <Upload size={18} strokeWidth={1.8} aria-hidden="true" />
              {upload.isPending ? "Subiendo el QR…" : "Subir un QR nuevo"}
            </Button>
            {upload.isError ? (
              <InlineError>{qrUploadMessage(upload.error)}</InlineError>
            ) : null}
            {status.isPending ? null : (
              <p className="tipo-secundario text-texto">
                {updatedLine(status.data.updatedAt)}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
