import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-marco bg-lino px-5 py-4">
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
  const dismiss = useMutation({
    mutationFn: dismissRecommendationRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recommendationsQueryOptions(month).queryKey,
      });
    },
  });

  return (
    <section
      aria-labelledby="recomendaciones-del-mes"
      className="flex flex-col gap-3"
    >
      <h2
        id="recomendaciones-del-mes"
        className="font-sans text-pie font-medium tracking-[0.12em] text-texto-tenue uppercase"
      >
        Recomendaciones del mes
      </h2>
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
