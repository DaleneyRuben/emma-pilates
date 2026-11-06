import { getGetStaffPhotoUrl } from "@pilates/api-contracts";
import { within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { apiUrl, jsonResponse } from "./msw";
import { staffMembersPath } from "./people-fixtures";

// FIX-041: the member panel's photo block, as the Administrator's and the
// Coordinator's specs drive it.
export const photoPath = (staffMemberId: string) =>
  `${staffMembersPath}/${staffMemberId}/photo`;

export const photoFileInput = (panel: HTMLElement) =>
  within(panel).getByLabelText("Archivo de la foto");

export const displayUrl = (imageAssetId: string) =>
  getGetStaffPhotoUrl(imageAssetId, { variant: "display" });

export const thumbnailUrl = (imageAssetId: string) =>
  getGetStaffPhotoUrl(imageAssetId, { variant: "thumbnail" });

export type PhotoCalls = { method: string; body: unknown }[];

/** Answers the photo commands after `gate` opens, recording each one. */
export const photoHandlers = (
  staffMemberId: string,
  calls: PhotoCalls,
  options: {
    gate?: Promise<void>;
    setResponse?: () => Response;
    removeResponse?: () => Response;
  } = {},
) => [
  http.put(apiUrl(photoPath(staffMemberId)), async ({ request }) => {
    const body = (await request.json()) as { imageAssetId: string };
    calls.push({ method: "PUT", body });
    await options.gate;
    return (
      options.setResponse?.() ??
      jsonResponse({
        staffMemberId,
        photo: { imageAssetId: body.imageAssetId },
      })
    );
  }),
  http.delete(apiUrl(photoPath(staffMemberId)), async () => {
    calls.push({ method: "DELETE", body: null });
    await options.gate;
    return (
      options.removeResponse?.() ?? new HttpResponse(null, { status: 204 })
    );
  }),
];

export const deferred = () => {
  let open = () => {};
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { gate, open };
};
