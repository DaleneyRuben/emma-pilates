import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { PromotionCardList } from "./promotion-card-list";
import { carouselSubtitle } from "./promotion-format";
import { promotionListQueryOptions } from "./promotion-queries";

function EmptyCarousel() {
  return (
    <section className="flex flex-col items-center gap-1 rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
      <p className="text-cuerpo text-texto-secundario">
        Todavía no hay promociones.
      </p>
      <p className="text-nota text-texto-tenue">
        Crea la primera con «Nueva promoción»; las clientas la verán en el
        inicio de la app cuando la publiques.
      </p>
    </section>
  );
}

// AW17: the carousel the Client Home shows (Client 02), as a list of cards
// in carousel order rather than the usual table, because the order is the
// thing being edited.
export function PromotionsPage() {
  const query = useQuery(promotionListQueryOptions());
  const forbidden = isForbidden(query.error);

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Promociones"
        subtitle={
          query.data === undefined
            ? undefined
            : carouselSubtitle(query.data.length)
        }
        actions={
          forbidden ? undefined : (
            <Button>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nueva promoción
            </Button>
          )
        }
      />
      {query.isPending ? (
        <LoadingNotice>Cargando promociones…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="las promociones"
          onRetry={() => void query.refetch()}
        />
      ) : query.data.length === 0 ? (
        <EmptyCarousel />
      ) : (
        <PromotionCardList promotions={query.data} onOpen={() => undefined} />
      )}
    </article>
  );
}
