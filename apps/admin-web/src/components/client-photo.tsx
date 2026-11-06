import {
  getGetClientPhotoForStaffUrl,
  type ClientPhotoDto,
} from "@pilates/api-contracts";
import { useState } from "react";
import { cn } from "../lib/cn";
import { initials } from "../lib/initials";

const sizes = {
  28: "size-7 text-[11px]",
  40: "size-10 text-nota",
} as const;

/**
 * FIX-041 (walkthrough n.º 30): a Client's circle wherever the web draws
 * her, her thumbnail when she has a photo, otherwise her initials in
 * Primario tinte. The admin-session cookie authenticates the same-origin
 * image.
 */
export function ClientPhoto({
  name,
  photo,
  size = 28,
  className,
}: {
  name: string;
  photo: ClientPhotoDto | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const src =
    photo == null
      ? undefined
      : getGetClientPhotoForStaffUrl(photo.imageAssetId, {
          variant: "thumbnail",
        });
  // A photo replaced or removed meanwhile answers 404: show the initials.
  const [failed, setFailed] = useState<string>();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primario-tinte font-medium text-primario-profundo",
        sizes[size],
        className,
      )}
    >
      {src === undefined || src === failed ? (
        <span aria-hidden="true">{initials(name)}</span>
      ) : (
        <img
          src={src}
          onError={() => setFailed(src)}
          alt={`Foto de ${name}`}
          className="size-full rounded-full object-cover"
        />
      )}
    </span>
  );
}
