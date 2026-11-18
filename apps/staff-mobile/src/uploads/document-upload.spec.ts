import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { pickPdf } from "./document-upload";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn().mockResolvedValue("JVBERg=="),
}));

const getDocument = DocumentPicker.getDocumentAsync as jest.Mock;
const asset = (overrides: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [
    {
      uri: "file:///cache/DocumentPicker/factura-000123.pdf",
      name: "factura-000123.pdf",
      mimeType: "application/pdf",
      size: 248_000,
      ...overrides,
    },
  ],
});

describe("pickPdf (FIX-049)", () => {
  afterEach(() => jest.clearAllMocks());

  it("opens the system file picker for PDFs and reads the chosen one", async () => {
    getDocument.mockResolvedValue(asset());

    await expect(pickPdf()).resolves.toEqual({
      uri: "file:///cache/DocumentPicker/factura-000123.pdf",
      bytes: new Uint8Array([37, 80, 68, 70]),
      mediaType: "application/pdf",
      fileName: "factura-000123.pdf",
    });
    expect(getDocument).toHaveBeenCalledWith({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
  });

  it("returns nothing when she leaves the picker", async () => {
    getDocument.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickPdf()).resolves.toBeNull();
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it.each([
    ["larger than 10 MB", { size: 10 * 1024 * 1024 + 1 }],
    ["not a PDF", { mimeType: "image/heic", name: "factura.heic" }],
  ])("refuses a file %s before uploading it", async (_label, overrides) => {
    getDocument.mockResolvedValue(asset(overrides));

    await expect(pickPdf()).rejects.toThrow("upload_rejected");
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it("names a file without a .pdf ending so the studio can open it", async () => {
    getDocument.mockResolvedValue(asset({ name: "Factura Mariana" }));

    await expect(pickPdf()).resolves.toMatchObject({ fileName: "Factura Mariana.pdf" });
  });
});
