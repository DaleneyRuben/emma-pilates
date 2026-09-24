type Dimensions = readonly [width: number, height: number];

/**
 * jsdom never decodes an image, so `new Image()` never loads. This stub
 * answers `naturalWidth`/`naturalHeight` for a source URL by the file
 * name at its end (`URL.createObjectURL` in jest.setup.ts ends the blob
 * URL with the file's name); an unknown name fails to load.
 */
export function useImageDimensions(byFileName: Record<string, Dimensions>) {
  let original: typeof window.Image;

  beforeEach(() => {
    original = window.Image;
    window.Image = class StubImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      set src(url: string) {
        const found = Object.entries(byFileName).find(([name]) =>
          url.endsWith(`/${name}`),
        );
        setTimeout(() => {
          if (found === undefined) {
            this.onerror?.();
            return;
          }
          [this.naturalWidth, this.naturalHeight] = found[1];
          this.onload?.();
        }, 0);
      }
    } as unknown as typeof window.Image;
  });

  afterEach(() => {
    window.Image = original;
  });
}

export const imageFile = (name: string, type = "image/png"): File =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], name, {
    type,
  });
