import { useRemoveNotification, useRestoreNotification } from "@pilates/api-contracts";
import { useState, type ReactNode } from "react";

import { UndoToast } from "../ui/undo-toast";

/**
 * Walkthrough n.º 10 (C19c, C19d, E-F15), shared by both apps' inboxes: a
 * removed notification leaves the list at once and the server hides it
 * (nothing is deleted); «Notificación borrada» offers «Deshacer» for a few
 * seconds, which brings it back.
 */
export function useNotificationRemoval({
  fetcher,
  onChanged,
}: {
  fetcher: typeof globalThis.fetch;
  /** Refreshes the list and the unread count after the server answered. */
  onChanged: () => void;
}): {
  isRemoved: (notificationId: string) => boolean;
  remove: (notificationId: string) => void;
  toast: ReactNode;
} {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);
  const unhide = (notificationId: string) =>
    setRemoved((current) => {
      const next = new Set(current);
      next.delete(notificationId);
      return next;
    });
  const removal = useRemoveNotification({
    fetcher,
    mutation: {
      onError: (_error, { notificationId }) => {
        unhide(notificationId);
        setLast((current) => (current === notificationId ? null : current));
      },
      onSuccess: onChanged,
    },
  });
  const restoration = useRestoreNotification({
    fetcher,
    mutation: { onSettled: onChanged },
  });

  const remove = (notificationId: string) => {
    setRemoved((current) => new Set(current).add(notificationId));
    setLast(notificationId);
    removal.mutate({ notificationId });
  };
  const undo = () => {
    if (last === null) return;
    unhide(last);
    restoration.mutate({ notificationId: last });
    setLast(null);
  };

  return {
    isRemoved: (notificationId) => removed.has(notificationId),
    remove,
    toast:
      last === null ? null : (
        <UndoToast
          key={last}
          onAction={undo}
          onExpire={() => setLast(null)}
          title="Notificación borrada"
        />
      ),
  };
}
