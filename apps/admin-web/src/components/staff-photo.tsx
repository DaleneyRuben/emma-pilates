import {
  getGetStaffPhotoUrl,
  type StaffPhotoDto,
} from "@pilates/api-contracts";
import { type ReactNode, useState } from "react";
import { cn } from "../lib/cn";
import { initials } from "../lib/initials";

const sizes = {
  18: "size-[18px] text-[7px]",
  20: "size-5 text-[8px]",
  32: "size-8 text-[11px]",
  36: "size-9 text-[11px]",
  40: "size-10 text-pie",
  96: "size-24 font-serif text-[35px]",
} as const;

const tones = {
  suave:
    "bg-superficie-hundida text-texto inset-ring-[1.5px] inset-ring-borde-fuerte",
  solido: "bg-rosa-600 text-blanco",
  "sobre-lateral": "bg-blanco text-texto",
} as const;

/** A photo URL the admin-session cookie authenticates (same origin). */
const staffPhotoUrl = (
  photo: StaffPhotoDto,
  variant: "thumbnail" | "display" = "thumbnail",
) => getGetStaffPhotoUrl(photo.imageAssetId, { variant });

/**
 * FIX-041 (follow-up 242): a Staff Member's circle, her photo when she has
 * one, otherwise her initials (Rosa Emma, rw.py): Rosa profundo on 50 in an
 * Arcilla ring, white on Rosa profundo for the signed-in account on the band,
 * or Rosa profundo on white over the Rosa profundo top bar. `src` overrides the stored
 * photo (the panel's preview while it uploads); `children` lays over it.
 */
export function StaffPhoto({
  name,
  photo,
  size,
  variant = size === 96 ? "display" : "thumbnail",
  src,
  tone = "suave",
  className,
  children,
}: {
  name: string;
  photo: StaffPhotoDto | null | undefined;
  size: keyof typeof sizes;
  variant?: "thumbnail" | "display";
  src?: string;
  tone?: "suave" | "solido" | "sobre-lateral";
  className?: string;
  children?: ReactNode;
}) {
  const shown =
    src ?? (photo == null ? undefined : staffPhotoUrl(photo, variant));
  // A photo replaced or removed meanwhile answers 404: show the initials.
  const [failed, setFailed] = useState<string>();
  return (
    <span
      data-photo=""
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {shown === undefined || shown === failed ? (
        <span aria-hidden="true">{initials(name)}</span>
      ) : (
        <img
          src={shown}
          onError={() => setFailed(shown)}
          alt={`Foto de ${name}`}
          className="size-full rounded-full object-cover"
        />
      )}
      {children}
    </span>
  );
}
