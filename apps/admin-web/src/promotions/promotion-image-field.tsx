import { ImagePlus } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { adminFetch } from "../api/fetcher";
import {
  checkImage,
  readImageDimensions,
  UploadFailure,
  uploadFailureMessage,
  uploadImage,
} from "../api/upload-image";
import { Button } from "../components/ui/button";
import { PromotionImagePreview } from "./promotion-image-preview";

/** The image the form will save: the current one or a freshly uploaded one. */
export type AttachedImage = {
  imageAssetId: string;
  width: number;
  height: number;
  /** What the preview shows: an object URL of the chosen file, or the private route. */
  previewUrl: string;
  /** The file's name, or "Imagen actual" for the one already attached. */
  label: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "failed"; message: string };

const acceptedTypes = "image/jpeg,image/png,image/webp";

/**
 * AW18 with follow-up 60: the dashed drop target first, then the chosen
 * image previewed at 16:9 with the discarded edges dimmed, its name and
 * size, «Cambiar imagen» and «Quitar». A file is checked in the browser
 * (ADR-0072's format and size, UPL-002's 1200 × 675 minimum) before the
 * three upload calls, and the worker's refusal is reported in place.
 */
export function PromotionImageField({
  value,
  onChange,
}: {
  value: AttachedImage | null;
  onChange: (image: AttachedImage | null) => void;
}) {
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const choose = async (file: File) => {
    setStatus({ kind: "uploading" });
    const previewUrl = URL.createObjectURL(file);
    try {
      // The format and weight are known before decoding; the size after.
      const before = checkImage("promotion", {
        mediaType: file.type,
        byteSize: file.size,
        width: Number.POSITIVE_INFINITY,
        height: Number.POSITIVE_INFINITY,
      });
      if (before !== null) throw new UploadFailure(before);
      const { width, height } = await readImageDimensions(previewUrl);
      const refusal = checkImage("promotion", {
        mediaType: file.type,
        byteSize: file.size,
        width,
        height,
      });
      if (refusal !== null) throw new UploadFailure(refusal);
      const imageAssetId = await uploadImage(file, "promotion", adminFetch);
      onChange({ imageAssetId, width, height, previewUrl, label: file.name });
      setStatus({ kind: "idle" });
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setStatus({ kind: "failed", message: uploadFailureMessage(error) });
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file !== undefined) void choose(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        Imagen
      </span>
      <input
        ref={input}
        type="file"
        accept={acceptedTypes}
        aria-label="Archivo de imagen"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file !== undefined) void choose(file);
        }}
      />
      {status.kind === "uploading" ? (
        <p
          role="status"
          className="rounded-control border border-dashed border-borde-fuerte bg-superficie px-4 py-6 text-center text-nota text-texto-tenue"
        >
          Subiendo la imagen…
        </p>
      ) : value === null ? (
        <div
          data-testid="promotion-drop-target"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center gap-1 rounded-control border border-dashed border-borde-fuerte bg-superficie px-4 py-6 text-center"
        >
          <button
            type="button"
            aria-describedby={hintId}
            onClick={() => input.current?.click()}
            className="flex flex-col items-center gap-1 rounded-control text-nota font-medium text-texto hover:text-primario focus-visible:shadow-foco"
          >
            <ImagePlus
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
              className="text-primario"
            />
            Sube una imagen
          </button>
          <p id={hintId} className="text-ayuda text-texto-tenue">
            Arrastra el archivo o haz clic · JPG, PNG o WEBP horizontal, mínimo
            1200 × 675 px
          </p>
        </div>
      ) : (
        <>
          <PromotionImagePreview image={value} />
          <div className="flex items-center gap-3">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => input.current?.click()}
            >
              Cambiar imagen
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-error hover:text-error-texto"
              onClick={() => {
                if (value.previewUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(value.previewUrl);
                }
                onChange(null);
              }}
            >
              Quitar
            </Button>
          </div>
        </>
      )}
      {status.kind === "failed" ? (
        <p role="alert" className="text-ayuda text-error-texto">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
