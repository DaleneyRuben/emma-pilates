import { StatusPill } from "../components/ui/status-pill";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { FilterChips } from "../components/ui/filter-chips";
import { InlineError } from "../components/ui/inline-error";
import { TextLink } from "../components/ui/text-link";
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
      <TextLink asChild className="self-start rounded-control">
        <Link
          to="/clientas"
          search={{
            q: item.clientName,
            cliente: item.clientId ?? item.subject,
          }}
        >
          {item.clientName}
        </Link>
      </TextLink>
    );
  }
  if (item.rule === "weak_schedule" && item.trainerName != null) {
    const day = weekdays[item.weekday ?? 0] ?? "";
    return (
      <p className="tipo-titulo-fila text-texto">
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
    // Rosa Emma (RW-informes): each finding is its own white card, its
    // state a pill (a new one solid) and «Descartar» a link.
    <li className="flex flex-col gap-2 rounded-tarjeta bg-superficie px-[18px] py-4 shadow-tarjeta">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Subject item={item} />
        <p className="tipo-compacto text-texto">{item.detail}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <StatusPill tone={item.state === "new" ? "accion" : "neutral"}>
          {stateLabel[item.state]}
        </StatusPill>
        {/* A resolved finding that holds again comes back unless discarded. */}
        {readOnly || item.state === "dismissed" ? null : (
          <TextLink
            disabled={pending}
            onClick={() => onDismiss(item.id)}
            className="rounded-control"
          >
            Descartar
          </TextLink>
        )}
      </div>
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
        <EmptyState>Nada pendiente en este grupo.</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta bg-superficie py-2 pr-2 pl-[18px] shadow-tarjeta">
        <h2 id="recomendaciones-del-mes" className="tipo-etiqueta text-texto">
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
        <InlineError>No pudimos recalcular las recomendaciones.</InlineError>
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
        <EmptyState>Nada que revisar este mes.</EmptyState>
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
