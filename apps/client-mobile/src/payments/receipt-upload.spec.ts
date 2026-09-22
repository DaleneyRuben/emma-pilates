import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { pickReceipt } from "./receipt-upload";

const picked = (uri: string, mimeType: string | undefined) =>
  ({
    canceled: false,
    assets: [{ uri, mimeType, width: 10, height: 10 }],
  }) as never;

describe("pickReceipt", () => {
  beforeEach(() => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(ImageManipulator.manipulateAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(btoa("bytes"));
  });

  it("re-encodes a HEIC photo as JPEG so the studio can review it", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///photo.heic", "image/heic"));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///photo.jpg", width: 10, height: 10 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///photo.heic",
      [],
      expect.objectContaining({ format: "jpeg" }),
    );
    expect(receipt).toMatchObject({
      uri: "file:///photo.jpg",
      mediaType: "image/jpeg",
    });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      "file:///photo.jpg",
      expect.anything(),
    );
  });

  it("re-encodes a photo whose type is unknown instead of guessing", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///IMG_0001", undefined));
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///IMG_0001.jpg", width: 10, height: 10 });

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    expect(receipt?.mediaType).toBe("image/jpeg");
  });

  it("keeps an accepted PNG untouched", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue(picked("file:///receipt.png", "image/png"));

    const receipt = await pickReceipt();

    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    expect(receipt).toMatchObject({
      uri: "file:///receipt.png",
      mediaType: "image/png",
    });
  });
});
