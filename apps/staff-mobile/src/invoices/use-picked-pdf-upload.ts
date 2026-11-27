import { useRef, useState } from "react";

import type { PickedImage } from "../uploads/image-upload";
import { loadImageUpload } from "../uploads/load-image-upload";

/** Where the chosen PDF's upload stands (E-D27, E-D29). */
export type PickedUpload =
  | { status: "idle" }
  | { progress: number; status: "uploading" }
  | { assetId: string; status: "ready" }
  | { status: "failed" };

/**
 * Walkthrough n.º 24 (E-D29): a chosen PDF is uploaded as soon as she picks
 * it, so its pages can be drawn before «Subir factura» attaches it. A newer
 * pick, «Cambiar» or the × discards an upload still running.
 */
export function usePickedPdfUpload(fetcher: typeof globalThis.fetch) {
  const [state, setState] = useState<PickedUpload>({ status: "idle" });
  const current = useRef<{ failed: boolean; promise: Promise<string> } | null>(null);
  const generation = useRef(0);

  const start = (file: PickedImage): Promise<string> => {
    generation.current += 1;
    const mine = generation.current;
    const update = (next: PickedUpload) => {
      if (generation.current === mine) setState(next);
    };
    update({ progress: 0, status: "uploading" });
    const promise = loadImageUpload().then(({ uploadImage }) =>
      uploadImage(file, "invoice", fetcher, (progress) =>
        update({ progress, status: "uploading" }),
      ),
    );
    const run = { failed: false, promise };
    current.current = run;
    promise.then(
      (assetId) => update({ assetId, status: "ready" }),
      () => {
        run.failed = true;
        update({ status: "failed" });
      },
    );
    return promise;
  };

  /** The upload under way or done, or a new one when the last one failed. */
  const ensure = (file: PickedImage): Promise<string> =>
    current.current === null || current.current.failed ? start(file) : current.current.promise;

  const clear = () => {
    generation.current += 1;
    current.current = null;
    setState({ status: "idle" });
  };

  return { clear, ensure, start, state };
}
