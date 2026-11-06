import type { ClientPhotoDto } from "@pilates/api-contracts";
import { within } from "@testing-library/react";

// FIX-041 (walkthrough n.º 30): a Client's face wherever the web draws her.
export const herPhoto: ClientPhotoDto = {
  imageAssetId: "1a000000-0000-5000-8000-0000000000f1",
};

export const herPhotoSrc = `/api/v1/client-photos/${herPhoto.imageAssetId}?variant=thumbnail`;

/** The Client's thumbnail, authenticated by the admin-session cookie. */
export const expectClientPhoto = (scope: HTMLElement, name: string) =>
  expect(
    within(scope).getByRole("img", { name: `Foto de ${name}` }),
  ).toHaveAttribute("src", herPhotoSrc);

/** Without a photo, her initials stand in and no image is drawn. */
export const expectClientInitials = (
  scope: HTMLElement,
  name: string,
  letters: string,
) => {
  expect(
    within(scope).queryByRole("img", { name: `Foto de ${name}` }),
  ).not.toBeInTheDocument();
  expect(within(scope).getByText(letters)).toBeInTheDocument();
};
