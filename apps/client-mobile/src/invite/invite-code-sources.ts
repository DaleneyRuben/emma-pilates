// Walkthrough n.º 13: where a friend's code reaches a freshly installed
// Client app. Android: Google Play keeps the invite link's `invite_code` as
// the install referrer (CW01b). iPhone: the invite page copied the code
// before opening the App Store (C01b8). Both need the 1.3.0 build: on an
// older one the native module is missing and they answer nothing.

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type InstallReferrerModule = { getInstallReferrerAsync: () => Promise<string> };

const codePattern = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
const referrerKey = "invite-install-referrer-code";
const clipboardKey = "invite-clipboard-read";
const none = "none";

export function parseInstallReferrer(referrer: string | null): string | null {
  if (referrer === null) return null;
  const code = new URLSearchParams(referrer).get("invite_code")?.trim().toUpperCase() ?? "";
  return codePattern.test(code) ? code : null;
}

/** Asks Google Play once and keeps the answer, so a later launch still has it. */
export async function readInstallReferrerCode({
  load,
  os,
  storage,
}: {
  load: () => Promise<InstallReferrerModule>;
  os: string;
  storage: Storage;
}): Promise<string | null> {
  if (os !== "android") return null;
  try {
    const kept = await storage.getItem(referrerKey);
    if (kept !== null) return kept === none ? null : kept;
    const code = parseInstallReferrer(await (await load()).getInstallReferrerAsync());
    await storage.setItem(referrerKey, code ?? none);
    return code;
  } catch {
    return null;
  }
}

/** iPhone only: a reader that looks at the clipboard once per install. */
export function clipboardCodeReader({
  clipboard,
  os,
  storage,
}: {
  clipboard: { hasStringAsync: () => Promise<boolean>; getStringAsync: () => Promise<string> };
  os: string;
  storage: Storage;
}): (() => Promise<string | null>) | undefined {
  if (os !== "ios") return undefined;
  return async () => {
    try {
      if ((await storage.getItem(clipboardKey)) !== null) return null;
      await storage.setItem(clipboardKey, "1");
      if (!(await clipboard.hasStringAsync())) return null;
      return await clipboard.getStringAsync();
    } catch {
      return null;
    }
  };
}
