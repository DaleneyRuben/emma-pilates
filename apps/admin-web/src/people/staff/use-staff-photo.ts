import {
  getGetCurrentStaffMemberProfileQueryKey,
  getListStaffMembersQueryKey,
  removeStaffMemberPhoto,
  setStaffMemberPhoto,
  type StaffMemberDto,
  type StaffPhotoDto,
} from "@pilates/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { uploadImage } from "../../api/upload-image";
import { currentSessionQueryOptions } from "../../session/session-queries";

export type StaffPhotoStatus =
  | { kind: "idle" }
  | { kind: "uploading"; previewUrl: string }
  | { kind: "removing" }
  | { kind: "failed"; message: string };

export const staffPhotoMessages = {
  wrongFile: "Elige una foto JPG, PNG o WebP de hasta 5 MB.",
  uploadFailed: "No pudimos subir la foto. Inténtalo de nuevo.",
  removeFailed: "No pudimos quitar la foto. Inténtalo de nuevo.",
} as const;

// Follow-up 242's file line, checked before any call is made.
export const staffPhotoAccept = "image/jpeg,image/png,image/webp";
const acceptedTypes = staffPhotoAccept.split(",");
// ADR-0072: a profile photo is at most 5 MB.
const maxBytes = 5 * 1024 * 1024;

/**
 * FIX-041: the member panel's photo saves the moment its upload finishes,
 * apart from the form's «Guardar», and «Quitar foto» removes it with no
 * confirmation. The panel keeps the result, since its row is a snapshot;
 * the Personal list and, for her own photo, the top bar's profile refresh.
 */
export function useStaffPhoto(member: StaffMemberDto) {
  const queryClient = useQueryClient();
  const { data: principal } = useQuery(currentSessionQueryOptions());
  const [photo, setPhoto] = useState<StaffPhotoDto | null>(member.photo);
  const [status, setStatus] = useState<StaffPhotoStatus>({ kind: "idle" });

  const previewUrl = status.kind === "uploading" ? status.previewUrl : null;
  useEffect(
    () => () => {
      if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const refresh = async () => {
    const own =
      principal?.identity.kind === "staff" &&
      principal.identity.staffMemberId === member.id;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getListStaffMembersQueryKey(),
      }),
      own
        ? queryClient.invalidateQueries({
            queryKey: getGetCurrentStaffMemberProfileQueryKey(),
          })
        : undefined,
    ]);
  };

  const choose = async (file: File) => {
    if (!acceptedTypes.includes(file.type) || file.size > maxBytes) {
      setStatus({ kind: "failed", message: staffPhotoMessages.wrongFile });
      return;
    }
    setStatus({ kind: "uploading", previewUrl: URL.createObjectURL(file) });
    try {
      const imageAssetId = await uploadImage(file, "profile_photo", adminFetch);
      const saved = await setStaffMemberPhoto(
        member.id,
        { imageAssetId },
        undefined,
        adminFetch,
      );
      setPhoto(saved.data.photo);
      setStatus({ kind: "idle" });
      await refresh();
    } catch {
      setStatus({ kind: "failed", message: staffPhotoMessages.uploadFailed });
    }
  };

  const remove = async () => {
    setStatus({ kind: "removing" });
    try {
      await removeStaffMemberPhoto(member.id, undefined, adminFetch);
      setPhoto(null);
      setStatus({ kind: "idle" });
      await refresh();
    } catch {
      setStatus({ kind: "failed", message: staffPhotoMessages.removeFailed });
    }
  };

  return { photo, status, choose, remove };
}
