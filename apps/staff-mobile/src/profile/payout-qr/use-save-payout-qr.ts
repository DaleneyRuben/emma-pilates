import {
  getGetOwnPayoutQrQueryKey,
  setOwnPayoutQr,
  type PayoutQrResultDto,
} from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useStaffFetcher } from "../../staff-fetcher";
import type { PickedImage } from "../../uploads/image-upload";
import { loadImageUpload } from "../../uploads/load-image-upload";

type QueryData = { data: PayoutQrResultDto; status: number; headers: Headers };

export type PayoutQrUpload =
  | { step: "idle" }
  | { step: "source" }
  | { step: "date"; picked: PickedImage; saving: boolean; failure: string | null };

const saveFailed = "No pudimos guardar tu QR. Inténtalo de nuevo.";

/**
 * FIX-072: the two sheets' flow. Pick the photo, ask its last valid day, then
 * upload it as `payout_qr` and keep both; the screen's query takes the answer.
 */
export function useSavePayoutQr(onSaved: (validUntil: string) => void) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const [upload, setUpload] = useState<PayoutQrUpload>({ step: "idle" });

  const pick = async (camera: boolean) => {
    setUpload({ step: "idle" });
    try {
      const { pickImage } = await loadImageUpload();
      const picked = await pickImage({ camera });
      if (picked !== null) setUpload({ step: "date", picked, saving: false, failure: null });
    } catch {
      setUpload({ step: "idle" });
    }
  };

  const save = async (validUntil: string) => {
    if (upload.step !== "date") return;
    const { picked } = upload;
    setUpload({ step: "date", picked, saving: true, failure: null });
    try {
      const { uploadImage } = await loadImageUpload();
      const imageAssetId = await uploadImage(picked, "payout_qr", fetcher);
      const response = await setOwnPayoutQr(
        { imageAssetId, validUntil },
        { headers: { "Content-Type": "application/json" } },
        fetcher,
      );
      if (response.status !== 200) throw new Error("payout_qr_not_saved");
      queryClient.setQueryData<QueryData>(getGetOwnPayoutQrQueryKey(), (old) =>
        old === undefined ? old : { ...old, status: 200, data: response.data },
      );
      void queryClient.invalidateQueries({ queryKey: getGetOwnPayoutQrQueryKey() });
      setUpload({ step: "idle" });
      onSaved(validUntil);
    } catch {
      setUpload({ step: "date", picked, saving: false, failure: saveFailed });
    }
  };

  return {
    upload,
    start: () => setUpload({ step: "source" }),
    cancel: () => setUpload({ step: "idle" }),
    pick: (camera: boolean) => void pick(camera),
    save: (validUntil: string) => void save(validUntil),
  };
}
