import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

const carouselRatio = 16 / 9;
const previewHeight = 240;

type Crop = "none" | "sides" | "ends";

/** Which edges the 16:9 centre crop (UPL-002) takes off this image. */
const cropOf = (width: number, height: number): Crop => {
  const ratio = width / height;
  if (Math.abs(ratio - carouselRatio) < 0.005) return "none";
  return ratio > carouselRatio ? "sides" : "ends";
};

/** The fraction of the width (sides) or height (ends) the crop keeps. */
const keptFraction = (width: number, height: number): number =>
  cropOf(width, height) === "sides"
    ? carouselRatio / (width / height)
    : width / height / carouselRatio;

const hints: Record<Crop, string | null> = {
  none: null,
  sides: "Se recorta al centro en 16:9: se pierden los bordes laterales.",
  ends: "Se recorta al centro en 16:9: se pierden los bordes superior e inferior.",
};

// Follow-up 60 §2: the preview keeps the file's own shape and dims the
// bands outside the central 16:9, so a portrait file makes the loss obvious
// before saving.
export function PromotionImagePreview({
  image,
}: {
  image: { previewUrl: string; width: number; height: number; label: string };
}) {
  const crop = cropOf(image.width, image.height);
  const band = `${((1 - keptFraction(image.width, image.height)) / 2) * 100}%`;
  const portrait = image.height > image.width;
  const box: CSSProperties = {
    aspectRatio: `${image.width} / ${image.height}`,
    maxHeight: previewHeight,
    width: portrait ? (previewHeight * image.width) / image.height : "100%",
  };
  const bandClass = "absolute bg-scrim-fuerte";

  return (
    <figure data-crop={crop} className="flex flex-col gap-1">
      <div className="flex justify-center overflow-hidden rounded-control border border-borde bg-blanco">
        <div style={box} className="relative max-w-full">
          <img
            src={image.previewUrl}
            alt="Vista previa de la imagen"
            className="block size-full object-contain"
          />
          {crop === "sides" ? (
            <>
              <span
                className={cn(bandClass, "inset-y-0 left-0")}
                style={{ width: band }}
              />
              <span
                className={cn(bandClass, "inset-y-0 right-0")}
                style={{ width: band }}
              />
            </>
          ) : crop === "ends" ? (
            <>
              <span
                className={cn(bandClass, "inset-x-0 top-0")}
                style={{ height: band }}
              />
              <span
                className={cn(bandClass, "inset-x-0 bottom-0")}
                style={{ height: band }}
              />
            </>
          ) : null}
        </div>
      </div>
      <figcaption className="text-ayuda text-texto-tenue tabular">
        {image.label} · {image.width} × {image.height}
      </figcaption>
      {hints[crop] === null ? null : (
        <p className="text-ayuda text-texto-tenue">{hints[crop]}</p>
      )}
    </figure>
  );
}
