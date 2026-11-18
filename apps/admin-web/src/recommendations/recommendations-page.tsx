import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import type { RecommendationDto } from "@pilates/api-contracts";
import {
  dismissRecommendationRequest,
  recommendationsQueryOptions,
  recomputeRecommendationsRequest,
} from "./recommendation-queries";

const stateLabel: Record<RecommendationDto["state"], string> = {
  new: "Nueva",
  seen: "Vista",
  dismissed: "Descartada",
  resolved: "Resuelta",
};

const weekdays = [
  "",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

// Walkthrough finding 107: who a finding is about. A Client's name opens
// her file in Clientes, as Comentarios does (FIX-063).
function Subject({ item }: { item: RecommendationDto }) {
  if (item.rule === "inactive_client" && item.clientName != null) {
    return (
      <Link
        to="/clientas"
        search={{ q: item.clientName, cliente: item.clientId ?? item.subject }}
        className="self-start rounded-control font-medium text-primario-profundo underline-offset-2 hover:underline focus-visible:shadow-foco"
      >
        {item.clientName}
      </Link>
    );
  }
  if (item.rule === "weak_schedule" && item.trainerName != null) {
    const day = weekdays[item.weekday ?? 0] ?? "";
    return (
      <p className="font-medium text-texto">
        {day === "" ? item.trainerName : `${item.trainerName} · ${day}`}
      </p>
    );
  }
  return null;
}

function Finding({
  item,
  readOnly,
  onDismiss,
  pending,
}: {
  item: RecommendationDto;
  readOnly: boolean;
  onDismiss: (id: string) => void;
  pending: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-marco bg-lino px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Subject item={item} />
        <p className="text-cuerpo text-texto">{item.detail}</p>
        <p className="text-nota text-texto-tenue">{stateLabel[item.state]}</p>
      </div>
      {readOnly || item.state === "dismissed" ? null : (
        <Button
          variant="neutral"
          size="sm"
          disabled={pending}
          onClick={() => onDismiss(item.id)}
        >
          Descartar
        </Button>
      )}
    </li>
  );
}

/**
 * AW44 inside Informes › El mes (follow-up 232: «El mes also carries the
 * recommendations»), for the month the page shows.
 */
export function RecommendationsSection({
  month,
  readOnly = false,
}: {
  month: string;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(recommendationsQueryOptions(month));
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: recommendationsQueryOptions(month).queryKey,
    });
  const recompute = useMutation({
    mutationFn: () => recomputeRecommendationsRequest(month),
    onSuccess: refresh,
  });
  const dismiss = useMutation({
    mutationFn: dismissRecommendationRequest,
    onSuccess: refresh,
  });

  return (
    <section
      aria-labelledby="recomendaciones-del-mes"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="recomendaciones-del-mes"
          className="font-sans text-pie font-medium tracking-[0.12em] text-texto-tenue uppercase"
        >
          Recomendaciones del mes
        </h2>
        {readOnly ? null : (
          <Button
            variant="neutral"
            size="sm"
            busy={recompute.isPending}
            onClick={() => recompute.mutate()}
          >
            Recalcular
          </Button>
        )}
      </div>
      {recompute.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos recalcular las recomendaciones.
        </p>
      ) : null}
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="las recomendaciones"
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : query.data === undefined ? (
        <LoadingNotice>Cargando las recomendaciones…</LoadingNotice>
      ) : query.data.recommendations.length === 0 ? (
        <p className="rounded-marco bg-lino px-6 py-10 text-center text-cuerpo text-texto-secundario">
          Nada que revisar este mes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {query.data.recommendations.map((item) => (
            <Finding
              key={item.id}
              item={item}
              readOnly={readOnly}
              pending={dismiss.isPending}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
