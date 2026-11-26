import {
  profilePhotoMaxEdge,
  uploadReadinessPollMilliseconds,
  waitForUploadReady,
} from "./upload-readiness";

// Walkthrough n.º 7 and 14: the worker usually has the image ready well
// under a second after finalizing, so the app asks every quarter second
// instead of every 0.7 s, and the first answer comes with no wait at all.
describe("waitForUploadReady", () => {
  it("asks at once and resolves as soon as the image is ready", async () => {
    const sleep = jest.fn(async () => undefined);
    const readState = jest
      .fn()
      .mockResolvedValueOnce("processing")
      .mockResolvedValueOnce("processing")
      .mockResolvedValueOnce("ready");

    await expect(waitForUploadReady(readState, sleep)).resolves.toBeUndefined();

    expect(readState).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(uploadReadinessPollMilliseconds);
    expect(uploadReadinessPollMilliseconds).toBe(250);
  });

  it("rejects an image the worker refused", async () => {
    const readState = jest.fn().mockResolvedValue("failed");

    await expect(waitForUploadReady(readState, async () => undefined)).rejects.toThrow(
      "upload_rejected",
    );
  });

  it("keeps the former 28-second budget before giving up", async () => {
    const sleep = jest.fn(async () => undefined);
    const readState = jest.fn().mockResolvedValue("processing");

    await expect(waitForUploadReady(readState, sleep)).rejects.toThrow(
      "upload_verification_timeout",
    );

    const waited = sleep.mock.calls.length * uploadReadinessPollMilliseconds;
    expect(waited).toBeGreaterThanOrEqual(27_000);
    expect(waited).toBeLessThanOrEqual(28_000);
  });

  it("sends a profile photo at 1024 px", () => {
    expect(profilePhotoMaxEdge).toBe(1024);
  });
});
