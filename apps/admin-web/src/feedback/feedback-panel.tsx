import { formatDateTime } from "@pilates/api-contracts";
import type {
  AdminFeedbackDto,
  AdminFeedbackDtoStatus,
} from "@pilates/api-contracts";
import { useId, useState, type FormEvent } from "react";
import { isApiError } from "../api/problem";
import { ChoiceChips } from "../components/form/choice-chips";
import { SidePanelBody, SidePanelFooter } from "../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../components/panel/summary-rows";
import { Button } from "../components/ui/button";
import { InlineError } from "../components/ui/inline-error";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  appLabels,
  roleLabelOf,
  statusLabels,
  systemLabel,
  versionLabel,
} from "./feedback-format";
import { useTriageFeedback } from "./feedback-queries";
import { FeedbackSender } from "./feedback-sender";

const statusOptions = (
  [
    "new",
    "reviewed",
    "resolved",
  ] as const satisfies readonly AdminFeedbackDtoStatus[]
).map((status) => [status, statusLabels[status]] as const);

const failureMessage = (error: unknown): string => {
  if (isApiError(error) && error.code === "feedback_not_found") {
    return "Este comentario ya no existe. Cierra el panel y vuelve a abrir la lista.";
  }
  if (isApiError(error) && error.code === "feedback_access_denied") {
    return "No tienes permiso para cambiar comentarios.";
  }
  return "No pudimos guardar. Inténtalo de nuevo.";
};

// AW38's detail: the whole comment, what the app attached, and the triage
// with the internal note «Qué cambiamos» (REL-012).
export function FeedbackPanel({
  feedback,
  onDone,
}: {
  feedback: AdminFeedbackDto;
  onDone: (notice: string) => void;
}) {
  const triage = useTriageFeedback();
  const noteId = useId();
  const [status, setStatus] = useState(feedback.status);
  const [note, setNote] = useState(feedback.changeNote ?? "");
  const [failure, setFailure] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    try {
      await triage.mutateAsync({
        feedbackId: feedback.id,
        status,
        changeNote: note.trim() === "" ? null : note.trim(),
      });
      onDone("Guardamos el comentario.");
    } catch (error) {
      setFailure(failureMessage(error));
    }
  };

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex flex-1 flex-col"
    >
      <SidePanelBody>
        <blockquote className="rounded-control border border-borde-fuerte bg-superficie px-3 py-2.5 tipo-cuerpo whitespace-pre-wrap text-texto">
          {feedback.text}
        </blockquote>
        <SummaryBlock title="Datos">
          <SummaryRow label="Fecha">
            <span className="tabular">
              {formatDateTime(feedback.createdAt)}
            </span>
          </SummaryRow>
          <SummaryRow label="App">{appLabels[feedback.app]}</SummaryRow>
          <SummaryRow label="Enviado por">
            <FeedbackSender feedback={feedback} />
          </SummaryRow>
          <SummaryRow label="Rol">{roleLabelOf(feedback)}</SummaryRow>
          <SummaryRow label="Correo">
            <span className="break-all">{feedback.senderEmail}</span>
          </SummaryRow>
          <SummaryRow label="Versión">
            <span className="tabular">{versionLabel(feedback)}</span>
          </SummaryRow>
          <SummaryRow label="Sistema">{systemLabel(feedback)}</SummaryRow>
        </SummaryBlock>
        <section className="flex flex-col gap-1.5">
          <h3 className="tipo-compacto-600 text-texto">Estado</h3>
          <ChoiceChips
            legend="Estado"
            name="feedback-status"
            value={status}
            options={statusOptions}
            onChange={setStatus}
          />
        </section>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={noteId}>Qué cambiamos</Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={2000}
            rows={4}
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="tipo-secundario text-texto">
            Ej.: Arreglamos la lista de reservas en la versión 1.0.2.
          </p>
          <p className="tipo-secundario text-texto">
            Nota interna: la clienta o el equipo no la ven. Va en el CSV.
          </p>
        </div>
        {failure === null ? null : <InlineError>{failure}</InlineError>}
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={triage.isPending}>
          Guardar
        </Button>
      </SidePanelFooter>
    </form>
  );
}
