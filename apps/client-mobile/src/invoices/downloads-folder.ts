import { requireOptionalNativeModule } from "expo";

/**
 * FIX-049: the app's own native module (`modules/emma-downloads`, Android
 * only) that writes a file into Descargas. `saveAsync` answers false on
 * Android 9 and older. Builds made before FIX-049, and iOS, have no module:
 * this returns null and the caller keeps its earlier way of saving.
 */
export type DownloadsFolder = {
  saveAsync: (fileUri: string, fileName: string, mediaType: string) => Promise<boolean>;
};

export const loadDownloadsFolder = (): DownloadsFolder | null =>
  requireOptionalNativeModule<DownloadsFolder>("EmmaDownloads");
