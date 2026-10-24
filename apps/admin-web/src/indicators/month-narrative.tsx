import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  askNarrativeQuestionRequest,
  narrativeQueryOptions,
} from "./narrative-queries";

export function MonthNarrative({ month }: { month: string }) {
  const query = useQuery(narrativeQueryOptions(month));
  const [question, setQuestion] = useState("");
  const asked = useMutation({ mutationFn: askNarrativeQuestionRequest });

  if (query.isError && isForbidden(query.error)) return null;
  if (query.isError) {
    return (
      <QueryFailure
        error={query.error}
        what="el informe"
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (query.data === undefined) {
    return <LoadingNotice>Cargando el informe…</LoadingNotice>;
  }

  const report = query.data;
  const trimmed = question.trim();

  return (
    <section
      aria-label="Informe del mes"
      className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-blanco px-5 py-4"
    >
      <h2 className="font-serif text-titulo-3 text-texto">Informe del mes</h2>
      {report.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-cuerpo text-texto">
          {paragraph}
        </p>
      ))}
      {report.actions.length === 0 ? null : (
        <ul aria-label="Acciones" className="flex flex-col gap-3">
          {report.actions.map((action) => (
            <li key={action.because} className="flex flex-col gap-1">
              <p className="text-cuerpo text-texto">{action.text}</p>
              <p className="text-nota text-texto-tenue">
                Porque: {action.because}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed.length === 0) return;
          asked.mutate({ month, question: trimmed });
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-nota text-texto-secundario">
          Pregunta sobre el mes
          <Input
            value={question}
            maxLength={200}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <Button type="submit" busy={asked.isPending}>
          Preguntar
        </Button>
      </form>
      {asked.isError ? (
        <p role="alert" className="text-cuerpo text-texto-secundario">
          No pudimos responder la pregunta.
        </p>
      ) : asked.data === undefined ? null : (
        <p className="text-cuerpo text-texto">{asked.data.answer}</p>
      )}
    </section>
  );
}
