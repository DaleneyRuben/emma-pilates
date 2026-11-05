import {
  getGetStaffPhotoUrl,
  type StaffPhotoDto,
} from "@pilates/api-contracts";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { initials } from "../lib/initials";

const sizes = {
  20: "size-5 text-[8px]",
  40: "size-10 text-nota",
  96: "size-24 font-serif text-[35px]",
} as const;

/** A photo URL the admin-session cookie authenticates (same origin). */
const staffPhotoUrl = (
  photo: StaffPhotoDto,
  variant: "thumbnail" | "display" = "thumbnail",
) => getGetStaffPhotoUrl(photo.imageAssetId, { variant });

/**
 * FIX-041 (follow-up 242): a Staff Member's circle, her photo when she has
 * one, otherwise her initials in Rosa tinte. `src` overrides the stored
 * photo (the panel's preview while it uploads); `children` lays over it.
 */
export function StaffPhoto({
  name,
  photo,
  size,
  variant = size === 96 ? "display" : "thumbnail",
  src,
  className,
  children,
}: {
  name: string;
  photo: StaffPhotoDto | null | undefined;
  size: keyof typeof sizes;
  variant?: "thumbnail" | "display";
  src?: string;
  className?: string;
  children?: ReactNode;
}) {
  const shown =
    src ?? (photo == null ? undefined : staffPhotoUrl(photo, variant));
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-rosa-tinte font-semibold text-rosa-enlace",
        sizes[size],
        className,
      )}
    >
      {shown === undefined ? (
        <span aria-hidden="true">{initials(name)}</span>
      ) : (
        <img
          src={shown}
          alt={`Foto de ${name}`}
          className="size-full rounded-full object-cover"
        />
      )}
      {children}
    </span>
  );
}
