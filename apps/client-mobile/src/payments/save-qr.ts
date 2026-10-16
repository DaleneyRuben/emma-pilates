import { useTransientNotice } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import { useState } from "react";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const savedVisibleMs = 8_000;

/**
 * Adds a `data:` image to the photo library. Only add access is asked for
 * (iOS «agregar fotos»; nothing on Android 13 and later), so the Client can
 * pick the QR in their bank app without the app reading their photos.
 */
export async function saveQrToLibrary(dataUri: string): Promise<boolean> {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUri);
  if (match === null) return false;
  const [, type = "image/png", base64 = ""] = match;
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
    if (!permission.granted) return false;
    const file = `${FileSystem.cacheDirectory}emma-pilates-qr.${extensions[type] ?? "png"}`;
    await FileSystem.writeAsStringAsync(file, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await MediaLibrary.saveToLibraryAsync(file);
    return true;
  } catch {
    return false;
  }
}

export type QrSavePlace = "card" | "view";

/**
 * «Guardar QR» on `10` and in «QR ampliado» (follow-up 95): the outcome shows
 * where the action was, and the saved notice fades like the others.
 */
export function useSaveQr(uri: string | null) {
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ place: QrSavePlace; saved: boolean }>();
  const savedNotice = useTransientNotice(
    outcome?.saved === true ? outcome : undefined,
    savedVisibleMs,
    () => setOutcome(undefined),
  );

  const save = async (place: QrSavePlace) => {
    if (uri === null || saving) return;
    setOutcome(undefined);
    setSaving(true);
    const saved = await saveQrToLibrary(uri);
    setSaving(false);
    setOutcome({ place, saved });
  };

  return {
    failedAt: outcome?.saved === false ? outcome.place : null,
    save,
    savedAt: savedNotice?.place ?? null,
    saving,
  };
}
