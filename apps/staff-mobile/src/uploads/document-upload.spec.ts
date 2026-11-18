import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { pickPdf } from "./document-upload";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn().mockResolvedValue("JVBERi0="),
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
      bytes: new Uint8Array([37, 80, 68, 70, 45]),
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

  it("refuses a file larger than 10 MB before reading it", async () => {
    getDocument.mockResolvedValue(asset({ size: 10 * 1024 * 1024 + 1 }));

    await expect(pickPdf()).rejects.toThrow("upload_rejected");
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  // FIX-049 review: some Android providers report no type, or
  // application/octet-stream, for a real PDF; its bytes decide.
  it.each([null, "application/octet-stream"])(
    "takes a PDF a provider reports as %s",
    async (mimeType) => {
      getDocument.mockResolvedValue(asset({ mimeType }));

      await expect(pickPdf()).resolves.toMatchObject({ mediaType: "application/pdf" });
    },
  );

  it("refuses a file that is not a PDF inside", async () => {
    getDocument.mockResolvedValue(asset({ mimeType: "application/octet-stream" }));
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce("/9j/4A==");

    await expect(pickPdf()).rejects.toThrow("upload_rejected");
  });

  it("refuses a file over 10 MB whose provider gave no size", async () => {
    getDocument.mockResolvedValue(asset({ size: undefined }));
    const big = new Uint8Array(10 * 1024 * 1024 + 3);
    big.set([37, 80, 68, 70, 45]);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      Buffer.from(big).toString("base64"),
    );

    await expect(pickPdf()).rejects.toThrow("upload_rejected");
  });

  it("names a file without a .pdf ending so the studio can open it", async () => {
    getDocument.mockResolvedValue(asset({ name: "Factura Mariana" }));

    await expect(pickPdf()).resolves.toMatchObject({ fileName: "Factura Mariana.pdf" });
  });
});
