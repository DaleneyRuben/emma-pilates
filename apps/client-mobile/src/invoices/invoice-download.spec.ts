import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { downloadInvoice } from "./invoice-download";

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn((folder: string) => `content://root/${folder}`),
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn().mockResolvedValue("content://root/Documents/factura"),
  },
}));

const access = FileSystem.StorageAccessFramework as unknown as {
  requestDirectoryPermissionsAsync: jest.Mock;
  createFileAsync: jest.Mock;
};
const pdf = () =>
  jest.fn().mockResolvedValue(new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }));

describe("downloadInvoice on Android", () => {
  const original = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  });

  it("opens the folder picker in Documentos and saves the PDF there", async () => {
    access.requestDirectoryPermissionsAsync.mockResolvedValue({
      granted: true,
      directoryUri: "content://root/Documents",
    });

    await expect(
      downloadInvoice({
        fetcher: pdf(),
        paymentId: "payment-1",
        fileName: "factura-000123.pdf",
        mediaType: "application/pdf",
      }),
    ).resolves.toBe("saved");

    expect(access.requestDirectoryPermissionsAsync).toHaveBeenCalledWith(
      "content://root/Documents",
    );
    expect(access.createFileAsync).toHaveBeenCalledWith(
      "content://root/Documents",
      "factura-000123",
      "application/pdf",
    );
  });

  it("saves nothing when she leaves the picker", async () => {
    access.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: false });
    access.createFileAsync.mockClear();

    await expect(
      downloadInvoice({
        fetcher: pdf(),
        paymentId: "payment-1",
        fileName: "factura-000123.pdf",
        mediaType: "application/pdf",
      }),
    ).resolves.toBe("cancelled");
    expect(access.createFileAsync).not.toHaveBeenCalled();
  });
});
