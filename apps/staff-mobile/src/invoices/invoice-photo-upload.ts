import * as ImagePicker from "expo-image-picker";

import { uploadPickedPhoto } from "../assistant/front-desk-receipt-upload";

/**
 * E5 «Tomar foto» or «Elegir de la galería»: the issued invoice as a photo,
 * uploaded with the `invoice` purpose until READY. Cancelled returns null.
 * A PDF is uploaded from the admin web: the Staff app has no document
 * picker yet (FIX-045).
 */
export async function pickInvoicePhoto(
  fetcher: typeof globalThis.fetch,
  source: "camera" | "library",
): Promise<{ imageAssetId: string; fileName: string } | null> {
  const camera = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : null;
  const result =
    camera?.granted === true
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;

  const imageAssetId = await uploadPickedPhoto(asset.uri, "invoice", fetcher);
  const named = asset.fileName?.replace(/\.(heic|heif|png|webp)$/i, ".jpg");
  return { imageAssetId, fileName: named ?? "factura.jpg" };
}
