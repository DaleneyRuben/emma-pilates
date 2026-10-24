import type { StudioSettingsDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { QueryFailure } from "../components/page/query-failure";
import { fixedRules, versionLine } from "./studio-rules-format";
import { StudioRulesForm } from "./studio-rules-form";
import { studioSettingsQueryOptions } from "./studio-rules-queries";

const cardClass =
  "flex flex-col gap-4 rounded-tarjeta border border-borde bg-blanco p-6 max-md:p-4";

const conflictMessage =
  "Alguien guardó otras reglas mientras editabas. Te mostramos las actuales: revisa y vuelve a guardar.";

function FixedRules({ settings }: { settings: StudioSettingsDto }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-titulo-panel text-texto">
          Reglas fijas
        </h2>
        <p className="text-ayuda text-texto-tenue">
          Solo cambian con una actualización del sistema.
        </p>
      </div>
      <dl className="flex flex-col divide-y divide-divisor">
        {fixedRules(settings).map((rule) => (
          <div
            key={rule.label}
            className="flex justify-between gap-6 py-2.5 max-md:flex-col max-md:gap-0.5"
          >
            <dt className="text-nota text-texto-secundario">{rule.label}</dt>
            <dd className="text-nota text-texto md:text-right">{rule.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// AW36 «Reglas del estudio» (BKM-004, ADR-0101): the Administrator edits the
// configurable Studio Settings and sees the fixed ones. Opened from the
// account menu (AW33).
export function StudioRulesPage() {
  const settings = useQuery(studioSettingsQueryOptions());
  const [notice, setNotice] = useState<"saved" | "conflict" | null>(null);
  const formTitleId = useId();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reglas del estudio"
        subtitle="Las reglas que siguen las apps y el sistema. Un cambio llega a las apps en un minuto, sin actualizarlas."
      />
      {notice === "saved" ? (
        <PageNotice>Guardamos las reglas del estudio.</PageNotice>
      ) : notice === "conflict" ? (
        <p
          role="alert"
          className="rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-2 text-nota text-advertencia-texto"
        >
          {conflictMessage}
        </p>
      ) : null}
      {settings.isPending ? (
        <p className="text-nota text-texto-tenue">Cargando las reglas…</p>
      ) : settings.isError ? (
        <QueryFailure
          error={settings.error}
          what="las reglas del estudio"
          onRetry={() => void settings.refetch()}
        />
      ) : (
        <>
          <section aria-labelledby={formTitleId} className={cardClass}>
            <div className="flex flex-col gap-1">
              <h2 id={formTitleId} className="text-titulo-panel text-texto">
                Puedes cambiar
              </h2>
              <p className="text-ayuda text-texto-tenue">
                {versionLine(settings.data)}
              </p>
            </div>
            <StudioRulesForm
              key={settings.data.version}
              settings={settings.data}
              onSaved={() => setNotice("saved")}
              onConflict={() => {
                setNotice("conflict");
                void settings.refetch();
              }}
            />
          </section>
          <FixedRules settings={settings.data} />
        </>
      )}
    </div>
  );
}
