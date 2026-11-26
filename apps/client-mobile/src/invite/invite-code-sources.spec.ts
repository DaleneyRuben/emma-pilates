import {
  clipboardCodeReader,
  parseInstallReferrer,
  readInstallReferrerCode,
} from "./invite-code-sources";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = { ...initial };
  return {
    getItem: jest.fn(async (key: string) => values[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values[key] = value;
    }),
    values,
  };
}

// Walkthrough n.º 13 (CW01b, C01b8): where a friend's code reaches a
// freshly installed Client app.
describe("invite code sources", () => {
  it("reads the code Google Play kept from the invite link", () => {
    expect(parseInstallReferrer("invite_code=LUCIA")).toBe("LUCIA");
    expect(parseInstallReferrer("utm_source=google-play&utm_medium=organic")).toBeNull();
    expect(parseInstallReferrer("invite_code=%3Cx%3E")).toBeNull();
    expect(parseInstallReferrer(null)).toBeNull();
  });

  it("asks Android once and keeps the answer for later launches", async () => {
    const storage = memoryStorage();
    const getInstallReferrerAsync = jest.fn().mockResolvedValue("invite_code=lucia");
    const load = jest.fn().mockResolvedValue({ getInstallReferrerAsync });

    await expect(readInstallReferrerCode({ os: "android", storage, load })).resolves.toBe("LUCIA");
    await expect(readInstallReferrerCode({ os: "android", storage, load })).resolves.toBe("LUCIA");
    expect(getInstallReferrerAsync).toHaveBeenCalledTimes(1);
  });

  it("answers nothing on iOS, or on a build without the native module", async () => {
    const load = jest.fn().mockRejectedValue(new Error("Cannot find native module"));

    await expect(
      readInstallReferrerCode({ os: "ios", storage: memoryStorage(), load }),
    ).resolves.toBeNull();
    await expect(
      readInstallReferrerCode({ os: "android", storage: memoryStorage(), load }),
    ).resolves.toBeNull();
  });

  it("reads the iPhone clipboard only once per install", async () => {
    const storage = memoryStorage();
    const clipboard = {
      hasStringAsync: jest.fn().mockResolvedValue(true),
      getStringAsync: jest.fn().mockResolvedValue("LUCIA"),
    };
    const read = clipboardCodeReader({ os: "ios", storage, clipboard });

    await expect(read?.()).resolves.toBe("LUCIA");
    await expect(read?.()).resolves.toBeNull();
    expect(clipboard.getStringAsync).toHaveBeenCalledTimes(1);
    expect(clipboardCodeReader({ os: "android", storage, clipboard })).toBeUndefined();
  });
});
