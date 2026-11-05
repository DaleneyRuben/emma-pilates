import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { imageFile } from "../../test/image-stubs";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  paolaMember,
  referralCodeHandler,
  staffMembersPath,
  staffPage,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  mondayReformer,
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  wednesdayMat,
} from "../../test/schedule-fixtures";
import {
  paolaProfile,
  signedInHandlers,
  staffProfilePath,
} from "../../test/session-handlers";
import {
  photoFileInput,
  photoHandlers,
  thumbnailUrl,
  type PhotoCalls,
} from "../../test/staff-photo-support";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../../test/upload-fixtures";

const photoId = "1b000000-0000-5000-8000-0000000000bb";

const profileWith = (photo: { imageAssetId: string } | null) =>
  http.get(apiUrl(staffProfilePath), () =>
    jsonResponse({ ...paolaProfile, photo }),
  );

const accountChip = () =>
  screen.findByRole("button", { name: "Tu cuenta: Paola Mendoza" });

// FIX-041 (follow-up 242): her photo, or her initials, wherever the web
// names a Staff Member with a circle.
describe("staff photos on the admin web", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse(staffPage([emma, paolaMember])),
      ),
    );
  });

  it("shows her photo in the top bar's account chip", async () => {
    server.use(profileWith({ imageAssetId: photoId }));
    renderAdmin("/estudio/personal");

    const chip = await accountChip();
    expect(
      await within(chip).findByRole("img", { name: "Foto de Paola Mendoza" }),
    ).toHaveAttribute("src", thumbnailUrl(photoId));
    expect(within(chip).queryByText("PM")).not.toBeInTheDocument();
  });

  it("keeps her initials in the chip when she has no photo", async () => {
    server.use(profileWith(null));
    renderAdmin("/estudio/personal");

    const chip = await accountChip();
    expect(await within(chip).findByText("PM")).toBeInTheDocument();
    expect(within(chip).queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows each member's photo or initials in the Personal list", async () => {
    server.use(
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse(
          staffPage([
            { ...emma, photo: { imageAssetId: photoId } },
            paolaMember,
          ]),
        ),
      ),
    );
    renderAdmin("/estudio/personal");

    const emmaRow = await screen.findByRole("row", { name: /Emma Vargas/ });
    expect(
      within(emmaRow).getByRole("img", { name: "Foto de Emma Vargas" }),
    ).toHaveAttribute("src", thumbnailUrl(photoId));
    const paolaRow = screen.getByRole("row", { name: /Paola Mendoza/ });
    expect(within(paolaRow).getByText("PM")).toBeInTheDocument();
    expect(within(paolaRow).queryByRole("img")).not.toBeInTheDocument();
  });

  it("refreshes her own chip when she changes her own photo", async () => {
    const seen: UploadSeen = { polls: 0 };
    const calls: PhotoCalls = [];
    let photo: { imageAssetId: string } | null = null;
    server.use(
      referralCodeHandler(),
      http.get(apiUrl(staffProfilePath), () =>
        jsonResponse({ ...paolaProfile, photo }),
      ),
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse(staffPage([emma, paolaMember])),
      ),
      ...uploadHandlers(seen),
      ...photoHandlers(paolaMember.id, calls, {
        setResponse: () => {
          photo = { imageAssetId: uploadedAssetId };
          return jsonResponse({ staffMemberId: paolaMember.id, photo });
        },
      }),
    );
    const { user } = renderAdmin("/estudio/personal");
    await user.click(
      await screen.findByRole("button", { name: "Paola Mendoza" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar miembro" });

    await user.upload(photoFileInput(panel), imageFile("paola.png"));

    const chip = await accountChip();
    await waitFor(() =>
      expect(
        within(chip).getByRole("img", { name: "Foto de Paola Mendoza" }),
      ).toHaveAttribute("src", thumbnailUrl(uploadedAssetId)),
    );
  });

  it("leads the trainer's name in a Horario block with her photo", async () => {
    server.use(
      ...sessionFormHandlers(),
      http.get(apiUrl(sessionsPath), () =>
        jsonResponse([
          { ...mondayReformer, trainerPhoto: { imageAssetId: photoId } },
          wednesdayMat,
        ]),
      ),
    );
    renderAdmin(`/horario?week=${nextMonday}`);

    const withPhoto = await screen.findByRole("button", {
      name: /^Reformer Pilates, 07:00, Valeria Peña/,
    });
    expect(
      within(withPhoto).getByRole("img", { name: "Foto de Valeria Peña" }),
    ).toHaveAttribute("src", thumbnailUrl(photoId));
    const without = screen.getByRole("button", {
      name: /^Mat Pilates, 16:00, Daniela Ortiz/,
    });
    expect(within(without).queryByRole("img")).not.toBeInTheDocument();
  });
});
