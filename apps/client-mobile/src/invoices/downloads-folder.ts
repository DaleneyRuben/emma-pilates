// FIX-049: built in the green commit.
export type DownloadsFolder = {
  saveAsync: (fileUri: string, fileName: string, mediaType: string) => Promise<boolean>;
};
export const loadDownloadsFolder = (): DownloadsFolder | null => null;
