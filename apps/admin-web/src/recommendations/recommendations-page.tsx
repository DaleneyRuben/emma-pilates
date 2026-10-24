import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { PageHeader } from "../components/page/page-header";
import { MonthStepper } from "../components/table/month-stepper";
import { Button } from "../components/ui/button";
import { boliviaMonth } from "../lib/bolivia-time";
import type { RecommendationDto } from "@pilates/api-contracts";
import {
  dismissRecommendationRequest,
  recommendationsQueryOptions,
} from "./recommendation-queries";

const stateLabel: Record<RecommendationDto["state"], string> = {
  new: "Nueva",
  seen: "Vista",
  dismissed: "Descartada",
  resolved: "Resuelta",
};

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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-borde bg-blanco px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1">
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

export function RecommendationsPage({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const latest = boliviaMonth();
  const [month, setMonth] = useState(latest);
  const queryClient = useQueryClient();
  const query = useQuery(recommendationsQueryOptions(month));
  const dismiss = useMutation({
    mutationFn: dismissRecommendationRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recommendationsQueryOptions(month).queryKey,
      });
    },
  });

  return (
    <article className="flex flex-col gap-6">
      <PageHeader
        title="Recomendaciones"
        subtitle="Hallazgos del mes a partir de los hechos del estudio"
        actions={
          <MonthStepper month={month} latest={latest} onChange={setMonth} />
        }
      />
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
        <p className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario">
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
    </article>
  );
}
