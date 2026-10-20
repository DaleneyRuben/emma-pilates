import type { AdminPromotionDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanel } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { PromotionCardList } from "./promotion-card-list";
import { carouselSubtitle } from "./promotion-format";
import { PromotionPanelForm } from "./promotion-panel";
import { promotionListQueryOptions } from "./promotion-queries";

type Panel =
  { kind: "closed" } | { kind: "open"; promotion?: AdminPromotionDto };

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
  const [panel, setPanel] = useState<Panel>({ kind: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const open = (promotion?: AdminPromotionDto) => {
    setNotice(null);
    setPanel({ kind: "open", promotion });
  };
  const close = () => setPanel({ kind: "closed" });
  const editing = panel.kind === "open" ? panel.promotion : undefined;
  const position =
    editing === undefined
      ? 0
      : (query.data?.findIndex((item) => item.id === editing.id) ?? -1) + 1;

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
            <>
              {/* Follow-up 102: AW35 has no sidebar entry of its own. */}
              <Button asChild variant="neutral">
                <Link to="/promociones/contactos">
                  <Users size={16} strokeWidth={1.8} aria-hidden="true" />
                  Contactos para promociones
                </Link>
              </Button>
              <Button onClick={() => open()}>
                <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                Nueva promoción
              </Button>
            </>
          )
        }
      />
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
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
        <PromotionCardList promotions={query.data} onOpen={open} />
      )}
      <SidePanel
        open={panel.kind === "open"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={editing === undefined ? "Nueva promoción" : "Editar promoción"}
        description={
          editing === undefined
            ? "Entrará al final del carrusel"
            : `Posición ${position} en el carrusel`
        }
      >
        <div key={editing?.id ?? "new"} className="flex flex-1 flex-col">
          <PromotionPanelForm
            promotion={editing}
            onDone={(message) => {
              close();
              setNotice(message ?? null);
            }}
          />
        </div>
      </SidePanel>
    </article>
  );
}
