import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { downloadInvoice } from "./invoice-download";
import { loadDownloadsFolder } from "./downloads-folder";

jest.mock("./downloads-folder", () => ({ loadDownloadsFolder: jest.fn(() => null) }));
const downloadsFolder = loadDownloadsFolder as jest.Mock;

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
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

  // FIX-049: no folder picker. The app's own native module (a build made
  // after FIX-049) writes into Descargas through MediaStore.
  it("saves the PDF straight to Descargas, without the folder picker", async () => {
    const saveAsync = jest.fn().mockResolvedValue(true);
    downloadsFolder.mockReturnValueOnce({ saveAsync });
    access.requestDirectoryPermissionsAsync.mockClear();

    await expect(
      downloadInvoice({
        fetcher: pdf(),
        paymentId: "payment-1",
        fileName: "factura 000123.pdf",
        mediaType: "application/pdf",
      }),
    ).resolves.toBe("downloads");

    expect(saveAsync).toHaveBeenCalledWith(
      "file:///cache/factura 000123.pdf",
      "factura 000123.pdf",
      "application/pdf",
    );
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/factura 000123.pdf",
      "JVBERg==",
      { encoding: "base64" },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("file:///cache/factura 000123.pdf", {
      idempotent: true,
    });
    expect(access.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
  });

  // FIX-049 review: a MediaStore failure still leaves her the folder picker.
  it("falls back to the folder picker when Descargas refuses the file", async () => {
    downloadsFolder.mockReturnValueOnce({
      saveAsync: jest.fn().mockRejectedValue(new Error("downloads_insert_failed")),
    });
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
  });

  it("keeps a saved file saved when the cache copy cannot be removed", async () => {
    downloadsFolder.mockReturnValueOnce({ saveAsync: jest.fn().mockResolvedValue(true) });
    (FileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(new Error("busy"));

    await expect(
      downloadInvoice({
        fetcher: pdf(),
        paymentId: "payment-1",
        fileName: "factura-000123.pdf",
        mediaType: "application/pdf",
      }),
    ).resolves.toBe("downloads");
  });

  it("falls back to the folder picker on Android 9 and older", async () => {
    downloadsFolder.mockReturnValueOnce({ saveAsync: jest.fn().mockResolvedValue(false) });
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
    expect(access.requestDirectoryPermissionsAsync).toHaveBeenCalled();
  });

  it("opens the folder picker in Documentos in a build without the module", async () => {
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
