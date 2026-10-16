import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { pickReceipt } from "./receipt-upload";

const picked = (uri: string, mimeType: string, width: number, height: number) =>
  ({
    canceled: false,
    assets: [{ uri, mimeType, width, height }],
  }) as never;

describe("pickReceipt", () => {
  beforeEach(() => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(ImageManipulator.manipulateAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(btoa("bytes"));
  });

  // UPL-003: a phone photo or screenshot travels at most 2048 px on its
  // longest side, the size of the studio's readable receipt (ADR-0073).
  it("downscales a wide camera photo to 2048 px and sends it as JPEG", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///photo.jpg", "image/jpeg", 4288, 2848));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///small.jpg", width: 2048, height: 1360 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///photo.jpg",
      [{ resize: { width: 2048 } }],
      { compress: 0.8, format: "jpeg" },
    );
    expect(receipt).toMatchObject({ uri: "file:///small.jpg", mediaType: "image/jpeg" });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      "file:///small.jpg",
      expect.anything(),
    );
  });

  it("downscales a tall screenshot by its height", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///shot.png", "image/png", 1440, 3200));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///shot.jpg", width: 922, height: 2048 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///shot.png",
      [{ resize: { height: 2048 } }],
      { compress: 0.8, format: "jpeg" },
    );
    expect(receipt?.mediaType).toBe("image/jpeg");
  });

  it("re-encodes a small PNG as JPEG without resizing it", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///receipt.png", "image/png", 1206, 2048));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///receipt.jpg", width: 1206, height: 2048 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith("file:///receipt.png", [], {
      compress: 0.8,
      format: "jpeg",
    });
    expect(receipt).toMatchObject({ uri: "file:///receipt.jpg", mediaType: "image/jpeg" });
  });

  it("re-encodes a HEIC photo as JPEG so the studio can review it", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///photo.heic", "image/heic", 4032, 3024));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///photo.jpg", width: 2048, height: 1536 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///photo.heic",
      [{ resize: { width: 2048 } }],
      expect.objectContaining({ format: "jpeg" }),
    );
    expect(receipt?.mediaType).toBe("image/jpeg");
  });

  it("re-encodes a photo of unknown size and type instead of guessing", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///IMG_0001" }],
    } as never);
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///IMG_0001.jpg", width: 10, height: 10 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///IMG_0001",
      [],
      expect.objectContaining({ format: "jpeg" }),
    );
    expect(receipt?.mediaType).toBe("image/jpeg");
  });

  it("asks the picker for the original so the photo is encoded only once", async () => {
    await pickReceipt();

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 1 }),
    );
  });
});
