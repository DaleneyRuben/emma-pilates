import type { PickedImage } from "./image-upload";

// FIX-049: E5 «Elegir un PDF». Built in the green commit.
export async function pickPdf(): Promise<PickedImage | null> {
  throw new Error("not_implemented");
}
