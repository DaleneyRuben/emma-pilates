// Shared by both apps' upload protocol (UPL-001, ADR-0073): once finalized,
// the worker verifies and rebuilds the image. Measured locally on 26 Nov
// (walkthrough n.º 7 and 14) it is ready about 0.5 to 0.9 s after finalizing,
// so a 0.7 s poll added up to 0.7 s of waiting; a quarter second keeps that
// under 0.25 s for one more cheap status read.
export const uploadReadinessPollMilliseconds = 250;
// The same 28-second budget the 0.7 s poll had (40 attempts).
const uploadReadinessAttempts = 112;

/** The largest edge a receipt or invoice photo is sent at (UPL-003). */
export const uploadMaxEdge = 2048;
/**
 * A profile photo shows in a circle of at most a few hundred points, so it
 * travels at 1024 px: still sharp on an iPad and the web, a quarter of the
 * pixels (walkthrough n.º 14).
 */
export const profilePhotoMaxEdge = 1024;

export type UploadState = "pending" | "processing" | "ready" | "attached" | "failed" | "deleted";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Reads the upload's state until the worker has made it READY. A refused
 * image throws `upload_rejected`; one still processing after the budget
 * throws `upload_verification_timeout`. `readState` answers null when the
 * read itself failed, which simply asks again.
 */
export async function waitForUploadReady(
  readState: () => Promise<UploadState | null>,
  sleep: (milliseconds: number) => Promise<void> = wait,
): Promise<void> {
  for (let attempt = 0; attempt < uploadReadinessAttempts; attempt += 1) {
    const state = await readState();
    if (state === "ready") return;
    if (state === "failed") throw new Error("upload_rejected");
    if (attempt < uploadReadinessAttempts - 1) await sleep(uploadReadinessPollMilliseconds);
  }
  throw new Error("upload_verification_timeout");
}
