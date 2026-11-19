import { formatDateTime } from "@pilates/api-contracts";
import type { AdminFeedbackDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { RowOpener } from "../catalog/catalog-page";
import { ClientPhoto } from "../components/client-photo";
import { appLabels, deviceLabel, typeLabels } from "./feedback-format";
import { FeedbackSender } from "./feedback-sender";
import { FeedbackStatusPill } from "./feedback-status-pill";

const columns = createColumnHelper<AdminFeedbackDto>();

/** «App de clientas · 1.0.1 (3) · Android 14», under the comment. */
const appLine = (feedback: AdminFeedbackDto) =>
  `${appLabels[feedback.app]} · ${deviceLabel(feedback)}`;

// FIX-091 (W3 B): sender with her circle, the comment with the app and
// version under it, type, status as a plain word, and date.
export const feedbackColumns = (open: (row: AdminFeedbackDto) => void) => [
  columns.accessor("senderName", {
    header: "Enviado por",
    meta: { card: "detail", cardOrder: 1 },
    cell: ({ row }) => (
      <span className="flex items-center gap-2.5 whitespace-nowrap">
        <ClientPhoto
          name={row.original.senderName}
          photo={null}
          className="max-md:hidden"
        />
        <FeedbackSender feedback={row.original} />
      </span>
    ),
  }),
  columns.accessor("text", {
    header: "Comentario",
    meta: { card: "title" },
    cell: ({ row }) => (
      <span className="flex max-w-[460px] flex-col gap-0.5">
        <span className="line-clamp-2">
          <RowOpener
            label={row.original.text}
            onOpen={() => open(row.original)}
          />
        </span>
        <span className="text-nota text-texto-tenue tabular">
          {appLine(row.original)}
        </span>
      </span>
    ),
  }),
  columns.accessor("type", {
    header: "Tipo",
    meta: { card: "detail", cardOrder: 2 },
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{typeLabels[getValue()]}</span>
    ),
  }),
  columns.accessor("status", {
    header: "Estado",
    cell: ({ getValue }) => <FeedbackStatusPill status={getValue()} />,
  }),
  columns.accessor("createdAt", {
    header: "Fecha",
    meta: { card: "detail", cardOrder: 3 },
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-texto-secundario tabular">
        {formatDateTime(getValue())}
      </span>
    ),
  }),
];
