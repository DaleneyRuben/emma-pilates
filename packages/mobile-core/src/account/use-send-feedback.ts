import { sendFeedback, type SendFeedbackDtoType } from "@pilates/api-contracts";
import { useRef, useState } from "react";

import type { FeedbackMetadata } from "./feedback-metadata";

export type FeedbackType = SendFeedbackDtoType;

const failures: Record<string, string> = {
  feedback_limit_reached: "Ya enviaste 10 comentarios hoy. Puedes enviar otro mañana.",
  impersonation_forbidden: "Mientras ves la app como otra persona no puedes enviar comentarios.",
};
const genericFailure = "No pudimos enviar tu comentario. Inténtalo de nuevo.";

/**
 * POST /api/v1/feedback under an Idempotency-Key that stays the same while
 * the comment does, so a retried tap after a lost answer stores it once, and
 * changes with the comment, so an edited one is not refused as a reused key.
 */
export function useSendFeedback({
  fetcher,
  metadata,
  newIdempotencyKey,
}: {
  fetcher: typeof globalThis.fetch;
  metadata: FeedbackMetadata;
  newIdempotencyKey: () => string;
}) {
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const send = async (type: FeedbackType, text: string) => {
    const message = { type, text: text.trim(), ...metadata };
    const body = JSON.stringify(message);
    if (attempt.current?.body !== body) {
      attempt.current = { body, key: newIdempotencyKey() };
    }
    setSending(true);
    setFailure(null);
    try {
      const response = (await sendFeedback(
        message,
        { headers: { "idempotency-key": attempt.current.key } },
        fetcher,
      )) as { status: number; data: unknown };
      if (response.status === 201) {
        setSent(true);
        return;
      }
      const code = (response.data as { code?: string } | null)?.code;
      setFailure((code === undefined ? undefined : failures[code]) ?? genericFailure);
    } catch {
      setFailure(genericFailure);
    } finally {
      setSending(false);
    }
  };

  return { send, sending, sent, failure };
}
