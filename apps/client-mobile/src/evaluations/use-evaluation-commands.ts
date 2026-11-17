import {
  attachEvaluationReceipt,
  cancelEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  type ClientEvaluationDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { pickReceipt } from "../payments/receipt-upload";
import { idempotency, uploadImage } from "../uploads/image-upload";
import { moveEvaluation, rescheduleFailure } from "./reschedule-evaluation";

export type ReceiptOutcome = "attached" | "failed" | "skipped";

/**
 * What the one «Evaluación nutricional» screen (follow-up 264) does to a
 * booked Evaluation: cancel it, attach its receipt, or move it to a slot.
 * Each command refreshes the lists, so the screen shows what is true now.
 */
export function useEvaluationCommands(fetcher: typeof globalThis.fetch) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [receiptReady, setReceiptReady] = useState<Record<string, true>>({});
  const [movingBusy, setMovingBusy] = useState(false);
  // One upload at a time, even for two taps before the next render.
  const uploadBusy = useRef(false);
  // One key per Evaluation and target slot until that move lands: a retry of
  // the same slot replays, another slot after an unclear failure is a new
  // command (the backend refuses a reused key with another body). The screen
  // stays mounted, so a landed move forgets its key: moving back later is a
  // new command, not a replay of the first one.
  const moveKeys = useRef(new Map<string, string>());
  const keyFor = (evaluationId: string, slotId: string): string => {
    const id = `${evaluationId}:${slotId}`;
    const known = moveKeys.current.get(id);
    if (known !== undefined) return known;
    const created = randomUUID();
    moveKeys.current.set(id, created);
    return created;
  };

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
      }),
      queryClient.invalidateQueries({ queryKey: getListEvaluationSlotsQueryKey() }),
    ]);

  const fail = (message: string) => {
    setFailure(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const cancel = async (evaluation: ClientEvaluationDto) => {
    setFailure(null);
    try {
      const response = await cancelEvaluation(evaluation.id, undefined, fetcher);
      if (response.status !== 204) fail("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
    } catch {
      fail("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
    } finally {
      await refresh();
    }
  };

  /**
   * «attached» or «failed» end the attempt; «skipped» means nothing happened
   * (she closed the picker, or another upload is still running).
   */
  const attachReceipt = async (evaluation: ClientEvaluationDto): Promise<ReceiptOutcome> => {
    if (uploadBusy.current) return "skipped";
    uploadBusy.current = true;
    setFailure(null);
    setUploadingId(evaluation.id);
    try {
      const picked = await pickReceipt();
      if (picked === null) return "skipped";
      const imageAssetId = await uploadImage(picked, "transfer_receipt", fetcher);
      const attached = await attachEvaluationReceipt(
        evaluation.id,
        { imageAssetId },
        idempotency(),
        fetcher,
      );
      if (attached.status !== 204) {
        fail("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
        return "failed";
      }
      setReceiptReady((current) => ({ ...current, [evaluation.id]: true }));
      await refresh();
      return "attached";
    } catch {
      fail("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
      return "failed";
    } finally {
      uploadBusy.current = false;
      setUploadingId(null);
    }
  };

  /** Resolves the moved Evaluation, or null with the failure shown. */
  const move = async (
    evaluation: ClientEvaluationDto,
    slot: EvaluationSlotDto,
  ): Promise<ClientEvaluationDto | null> => {
    if (movingBusy) return null;
    setMovingBusy(true);
    setFailure(null);
    try {
      const response = await moveEvaluation(
        evaluation.id,
        slot,
        keyFor(evaluation.id, slot.id),
        fetcher,
      );
      if (response.status === 200) {
        moveKeys.current.delete(`${evaluation.id}:${slot.id}`);
        return response.data;
      }
      fail(rescheduleFailure(response.data));
      return null;
    } catch {
      fail("No pudimos reprogramar la evaluación. Inténtalo de nuevo.");
      return null;
    } finally {
      setMovingBusy(false);
      // The move may have landed, or the slot may be gone.
      await refresh();
    }
  };

  return {
    attachReceipt,
    cancel,
    clearFailure: () => setFailure(null),
    failure,
    move,
    movingBusy,
    receiptReady,
    uploadingId,
  };
}
