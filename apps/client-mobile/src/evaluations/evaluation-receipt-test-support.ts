import { encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse } from "../test-support";
import { pngHeader, receiptBytes } from "../payments/purchase-test-support";

export const paid = { included: false, priceCentavos: 7_000 };

// The studio QR the transfer steps load (follow-up 262).
export const qrRoute = {
  "/api/v1/transfer-instructions/qr": () =>
    new Response(pngHeader(200, 200), { headers: { "Content-Type": "image/png" } }),
};

export function chooseReceipt() {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///receipt.png",
        mimeType: "image/png",
        fileSize: receiptBytes.byteLength,
        width: 10,
        height: 10,
      },
    ],
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
}

export function uploadRoutes() {
  let statusReads = 0;
  return {
    "POST /api/v1/uploads": () =>
      jsonResponse(
        {
          id: "asset-1",
          uploadUrl: "/api/v1/uploads/asset-1/object",
          expiresAt: "2026-09-21T15:15:00.000Z",
        },
        201,
      ),
    "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
    "POST /api/v1/uploads/asset-1/finalize": () =>
      jsonResponse({ id: "asset-1", state: "processing" }, 202),
    "/api/v1/uploads/asset-1": () => {
      statusReads += 1;
      return jsonResponse({
        id: "asset-1",
        state: statusReads < 2 ? "processing" : "ready",
        mediaType: "image/jpeg",
      });
    },
  };
}
