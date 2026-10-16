import { SidePanelFooter } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";

/**
 * AW18 footer (follow-up 39 §3). A private draft, or a published Promotion
 * whose image is about to change, offers «Guardar borrador» and «Publicar»
 * (disabled until image, title, description, and both dates exist). A
 * published Promotion keeps «Guardar cambios» and «Dejar de publicar».
 * One solid button per view: «Publicar» or «Guardar cambios».
 */
/** The footer button whose request is in flight spins (follow-up 93). */
export type FooterAction = "draft" | "changes" | "publish" | "unpublish";

export function PromotionPanelFooter({
  published,
  publishable,
  pending,
  sending,
  editing,
  onSaveDraft,
  onPublish,
  onSaveChanges,
  onUnpublish,
  onDelete,
}: {
  published: boolean;
  publishable: boolean;
  pending: boolean;
  sending: FooterAction | null;
  /** An existing Promotion can also be deleted. */
  editing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSaveChanges: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  return (
    <SidePanelFooter>
      {published ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            busy={sending === "changes"}
            onClick={(event) => {
              event.preventDefault();
              onSaveChanges();
            }}
          >
            Guardar cambios
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={pending}
            busy={sending === "unpublish"}
            onClick={onUnpublish}
          >
            Dejar de publicar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            disabled={pending}
            busy={sending === "draft"}
            onClick={(event) => {
              event.preventDefault();
              onSaveDraft();
            }}
          >
            Guardar borrador
          </Button>
          <Button
            size="lg"
            disabled={!publishable || pending}
            busy={sending === "publish"}
            onClick={onPublish}
          >
            Publicar
          </Button>
        </div>
      )}
      {editing ? (
        <Button
          variant="link"
          className="self-center text-error hover:text-error-texto"
          disabled={pending}
          onClick={onDelete}
        >
          Eliminar promoción
        </Button>
      ) : null}
    </SidePanelFooter>
  );
}
