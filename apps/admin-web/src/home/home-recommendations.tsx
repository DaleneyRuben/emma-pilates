import { cn } from "../lib/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
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

const textLink =
  "rounded-control text-nota font-bold text-texto underline underline-offset-[3px] hover:decoration-2 focus-visible:shadow-foco";

// On the 100 page a link beside a section title is large text (19 px bold).
const sectionLink = cn(textLink, "text-grande underline-offset-4");

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
        <p className="text-cuerpo font-bold text-texto">{group.title}</p>
        <p className="text-nota text-texto">{group.note}</p>
      </div>
      <div className="flex items-center gap-5">
        <Link
          to={group.link.to}
          search={"search" in group.link ? group.link.search : undefined}
          className={textLink}
        >
          {group.link.label}
        </Link>
        {readOnly ? null : (
          <button
            type="button"
            aria-label={`Descartar: ${group.title}`}
            disabled={pending}
            onClick={() => onDismiss(group)}
            className="rounded-control text-nota font-bold text-texto underline underline-offset-[3px] hover:decoration-2 focus-visible:shadow-foco disabled:opacity-60"
          >
            Descartar
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * FIX-084 (Inicio A): the month's recommendations grouped by person or
 * type, without the settled ones, at most three rows; «Ver las N» opens
 * them all in Informes, where Recalcular lives.
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
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="inicio-recomendaciones" className="text-seccion text-texto">
          Recomendaciones
        </h2>
        {open > shown.length ? (
          <Link to="/informes" className={sectionLink}>
            {`Ver las ${open}`}
          </Link>
        ) : shown.length === 0 ? (
          <Link to="/informes" className={sectionLink}>
            Ir a Informes
          </Link>
        ) : null}
      </div>
      {dismiss.isError ? (
        <p role="alert" className="text-ayuda text-texto">
          {dismissFailureText(dismiss.error)}
        </p>
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
        <p className="rounded-tarjeta bg-superficie shadow-tarjeta px-5 py-4 text-cuerpo text-texto">
          Nada que revisar este mes.
        </p>
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
        </ul>
      )}
    </section>
  );
}
