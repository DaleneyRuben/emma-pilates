import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { InlineError } from "../components/ui/inline-error";
import { TextLink } from "../components/ui/text-link";
import {
  recommendationGroups,
  type RecommendationGroup,
} from "../recommendations/recommendation-groups";
import {
  dismissRecommendationRequest,
  recommendationsQueryOptions,
} from "../recommendations/recommendation-queries";

const shownGroups = 3;

class DismissFailure extends Error {
  readonly failed: number;
  readonly total: number;

  constructor(failed: number, total: number) {
    super("dismiss failed");
    this.failed = failed;
    this.total = total;
  }
}

const dismissFailureText = (error: unknown) =>
  error instanceof DismissFailure && error.total > 1
    ? `No pudimos descartar ${error.failed} de las ${error.total} recomendaciones.`
    : "No pudimos descartar la recomendación.";

function GroupRow({
  group,
  readOnly,
  pending,
  onDismiss,
}: {
  group: RecommendationGroup;
  readOnly: boolean;
  pending: boolean;
  onDismiss: (group: RecommendationGroup) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-superficie-hundida px-4 py-4 first:border-t-0 md:px-5">
      <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-0.5">
        <p className="tipo-titulo-fila text-texto">{group.title}</p>
        <p className="tipo-secundario text-texto">{group.note}</p>
      </div>
      <div className="flex items-center gap-5">
        <TextLink asChild>
          <Link
            to={group.link.to}
            search={"search" in group.link ? group.link.search : undefined}
          >
            {group.link.label}
          </Link>
        </TextLink>
        {readOnly ? null : (
          <TextLink
            aria-label={`Descartar: ${group.title}`}
            disabled={pending}
            onClick={() => onDismiss(group)}
          >
            Descartar
          </TextLink>
        )}
      </div>
    </li>
  );
}

/**
 * FIX-084 (Inicio A): the month's recommendations grouped by person or
 * type, without the settled ones, at most three rows; «Ver las N», the
 * list's last row, opens them all in Informes, where Recalcular lives.
 * Follow-up 285: every link sits inside the white list, never on the 100.
 */
export function HomeRecommendations({
  month,
  readOnly,
}: {
  month: string;
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(recommendationsQueryOptions(month));
  // Each finding is its own request; the ones that fail are counted.
  const dismiss = useMutation({
    mutationFn: async (group: RecommendationGroup) => {
      const results = await Promise.allSettled(
        group.ids.map((id) => dismissRecommendationRequest(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new DismissFailure(failed, group.ids.length);
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: recommendationsQueryOptions(month).queryKey,
      }),
  });
  const { groups, open } = recommendationGroups(
    query.data?.recommendations ?? [],
  );
  const shown = groups.slice(0, shownGroups);

  return (
    <section
      aria-labelledby="inicio-recomendaciones"
      className="flex flex-col gap-2.5"
    >
      <h2
        id="inicio-recomendaciones"
        className="tipo-titulo-seccion text-texto"
      >
        Recomendaciones
      </h2>
      {dismiss.isError ? (
        <InlineError>{dismissFailureText(dismiss.error)}</InlineError>
      ) : null}
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="las recomendaciones"
          onRetry={() => void query.refetch()}
        />
      ) : query.data === undefined ? (
        <LoadingNotice>Cargando las recomendaciones…</LoadingNotice>
      ) : shown.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-tarjeta bg-superficie px-5 py-4 text-texto shadow-tarjeta">
          <p className="tipo-cuerpo">Nada que revisar este mes.</p>
          <TextLink asChild>
            <Link to="/informes">Ir a Informes</Link>
          </TextLink>
        </div>
      ) : (
        <ul className="flex flex-col rounded-tarjeta bg-superficie shadow-tarjeta">
          {shown.map((group) => (
            <GroupRow
              key={group.key}
              group={group}
              readOnly={readOnly}
              pending={dismiss.isPending}
              onDismiss={(chosen) => dismiss.mutate(chosen)}
            />
          ))}
          {open > shown.length ? (
            <li className="border-t border-superficie-hundida px-4 py-4 md:px-5">
              <TextLink asChild>
                <Link to="/informes">{`Ver las ${open}`}</Link>
              </TextLink>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
