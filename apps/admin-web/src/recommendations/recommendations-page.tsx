import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { FilterChips } from "../components/ui/filter-chips";
import type { RecommendationDto } from "@pilates/api-contracts";
import { monthKpisQueryOptions } from "../indicators/indicator-queries";
import { narrativeQueryOptions } from "../indicators/narrative-queries";
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
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-divisor px-4 py-3.5 first:border-t-0 md:px-5">
      <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-0.5">
        <Subject item={item} />
        <p className="text-cuerpo text-texto">{item.detail}</p>
        <p className="text-nota text-texto-tenue">{stateLabel[item.state]}</p>
      </div>
      {/* A resolved finding that holds again comes back unless discarded. */}
      {readOnly || item.state === "dismissed" ? null : (
        <button
          type="button"
          disabled={pending}
          onClick={() => onDismiss(item.id)}
          className="rounded-control text-celda font-medium text-rosa-profundo underline underline-offset-2 focus-visible:shadow-foco disabled:no-underline"
        >
          Descartar
        </button>
      )}
    </li>
  );
}

type Kind = "schedule" | "clients" | "settled";

const settled = (item: RecommendationDto) =>
  item.state === "dismissed" || item.state === "resolved";

const kindOf = (item: RecommendationDto): Kind =>
  settled(item)
    ? "settled"
    : item.rule === "inactive_client"
      ? "clients"
      : "schedule";

const kinds: readonly Kind[] = ["schedule", "clients", "settled"];

// FIX-091 (W6 B): one type at a time, chosen with chips. Until a chip is
// chosen the first type with something in it shows.
function FindingsByKind({
  recommendations,
  readOnly,
  pending,
  onDismiss,
}: {
  recommendations: readonly RecommendationDto[];
  readOnly: boolean;
  pending: boolean;
  onDismiss: (id: string) => void;
}) {
  const [chosen, setChosen] = useState<Kind | undefined>(undefined);
  const count = (kind: Kind) =>
    recommendations.filter((item) => kindOf(item) === kind).length;
  const shownKind =
    chosen ?? kinds.find((kind) => count(kind) > 0) ?? "schedule";
  const shown = recommendations.filter((item) => kindOf(item) === shownKind);
  return (
    <>
      <FilterChips
        label="Tipo de recomendación"
        value={shownKind}
        options={[
          { value: "schedule", label: "Horario", count: count("schedule") },
          { value: "clients", label: "Clientas", count: count("clients") },
          { value: "settled", label: "Resueltas" },
        ]}
        onChange={(kind) => setChosen(kind)}
      />
      {shown.length === 0 ? (
        <p className="rounded-marco border border-borde bg-crema px-6 py-8 text-center text-cuerpo text-texto">
          Nada pendiente en este grupo.
        </p>
      ) : (
        <ul className="flex flex-col rounded-marco border border-borde bg-crema">
          {shown.map((item) => (
            <Finding
              key={item.id}
              item={item}
              readOnly={readOnly}
              pending={pending}
              onDismiss={onDismiss}
            />
          ))}
        </ul>
      )}
    </>
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
  // Recalcular refreshes the month's facts first, so the tiles and the month
  // report read them again with the findings.
  const recompute = useMutation({
    mutationFn: () => recomputeRecommendationsRequest(month),
    onSuccess: () =>
      Promise.all([
        refresh(),
        queryClient.invalidateQueries({
          queryKey: narrativeQueryOptions(month).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: monthKpisQueryOptions(month).queryKey,
        }),
      ]),
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
        <p className="rounded-marco border border-borde bg-lino px-6 py-10 text-center text-cuerpo text-texto-secundario">
          Nada que revisar este mes.
        </p>
      ) : (
        <FindingsByKind
          key={month}
          recommendations={query.data.recommendations}
          readOnly={readOnly}
          pending={dismiss.isPending}
          onDismiss={(id) => dismiss.mutate(id)}
        />
      )}
    </section>
  );
}
