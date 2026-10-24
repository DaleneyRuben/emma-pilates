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
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { formatCivilMoment } from "../lib/bolivia-time";
import {
  appLabels,
  roleLabels,
  statusLabels,
  systemLabel,
  versionLabel,
} from "./feedback-format";
import { useTriageFeedback } from "./feedback-queries";

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
        <blockquote className="rounded-control border border-divisor bg-blanco px-3 py-2.5 text-cuerpo whitespace-pre-wrap text-texto">
          {feedback.text}
        </blockquote>
        <SummaryBlock title="Datos">
          <SummaryRow label="Fecha">
            <span className="tabular">
              {formatCivilMoment(feedback.createdAt)}
            </span>
          </SummaryRow>
          <SummaryRow label="App">{appLabels[feedback.app]}</SummaryRow>
          <SummaryRow label="Rol">{roleLabels[feedback.role]}</SummaryRow>
          <SummaryRow label="Correo">
            <span className="break-all">{feedback.senderEmail}</span>
          </SummaryRow>
          <SummaryRow label="Versión">
            <span className="tabular">{versionLabel(feedback)}</span>
          </SummaryRow>
          <SummaryRow label="Sistema">{systemLabel(feedback)}</SummaryRow>
        </SummaryBlock>
        <section className="flex flex-col gap-1.5">
          <h3 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            Estado
          </h3>
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
            placeholder="Ej.: Arreglamos la lista de reservas en la versión 1.0.2."
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="text-ayuda text-texto-tenue">
            Nota interna: la clienta o el equipo no la ven. Va en el CSV.
          </p>
        </div>
        {failure === null ? null : (
          <p role="alert" className="text-nota text-error-texto">
            {failure}
          </p>
        )}
      </SidePanelBody>
      <SidePanelFooter>
        <Button type="submit" size="lg" busy={triage.isPending}>
          Guardar
        </Button>
      </SidePanelFooter>
    </form>
  );
}
