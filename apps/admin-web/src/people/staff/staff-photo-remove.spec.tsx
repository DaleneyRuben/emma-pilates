import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { imageFile } from "../../test/image-stubs";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  member,
  paolaMember,
  referralCodeHandler,
  staffMembersPath,
  staffPage,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { openMember } from "../../test/staff-panel-support";
import {
  deferred,
  displayUrl,
  photoFileInput,
  photoHandlers,
  type PhotoCalls,
} from "../../test/staff-photo-support";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../../test/upload-fixtures";

const photoId = "1b000000-0000-5000-8000-0000000000aa";
const emmaWithPhoto = { ...emma, photo: { imageAssetId: photoId } };
const carolina = member("06", "Carolina Rivas", {
  role: "coordinator",
  branchIds: [],
});

const listOf = (items: (typeof emma)[]) =>
  http.get(apiUrl(staffMembersPath), () => jsonResponse(staffPage(items)));

// FIX-041: «Quitar foto» removes the photo at once, with no confirmation.
describe("the member panel's photo removal", () => {
  useMockServer();
  const calls: PhotoCalls = [];
  beforeEach(() => {
    calls.length = 0;
    server.use(allBranchesHandler(), referralCodeHandler());
  });

  it("removes the photo and brings the initials back", async () => {
    const { gate, open } = deferred();
    server.use(
      ...signedInHandlers(),
      listOf([emmaWithPhoto, paolaMember]),
      ...photoHandlers(emma.id, calls, { gate }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    expect(
      within(panel).getByRole("img", { name: "Foto de Emma Vargas" }),
    ).toHaveAttribute("src", displayUrl(photoId));

    await user.click(
      within(panel).getByRole("button", { name: "Quitar foto" }),
    );

    expect(await within(panel).findByText("Quitando foto…")).toBeVisible();
    expect(within(panel).getByText("EV")).toBeVisible();
    open();
    await waitFor(() =>
      expect(
        within(panel).queryByText("Quitando foto…"),
      ).not.toBeInTheDocument(),
    );
    expect(calls).toEqual([{ method: "DELETE", body: null }]);
    expect(
      within(panel).queryByRole("img", { name: "Foto de Emma Vargas" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Quitar foto" }),
    ).not.toBeInTheDocument();
  });

  it("says the removal failed and keeps the photo", async () => {
    server.use(
      ...signedInHandlers(),
      listOf([emmaWithPhoto, paolaMember]),
      ...photoHandlers(emma.id, calls, {
        removeResponse: () => problemResponse(500, "internal_error"),
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(
      within(panel).getByRole("button", { name: "Quitar foto" }),
    );

    expect(
      await within(panel).findByText(
        "No pudimos quitar la foto. Inténtalo de nuevo.",
      ),
    ).toBeVisible();
    expect(
      within(panel).getByRole("img", { name: "Foto de Emma Vargas" }),
    ).toHaveAttribute("src", displayUrl(photoId));
  });

  it("lets the Coordinator change a Trainer's photo", async () => {
    const seen: UploadSeen = { polls: 0 };
    server.use(
      ...coordinatorHandlers(),
      listOf([emma, carolina]),
      ...uploadHandlers(seen),
      ...photoHandlers(emma.id, calls),
    );
    const { user } = renderAdmin("/estudio/personal");
    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Emma Vargas" });
    expect(
      within(panel).getByText(
        "Puedes cambiar sus sedes y su foto. Invitar y cambiar roles lo hace Administración.",
      ),
    ).toBeVisible();

    await user.upload(photoFileInput(panel), imageFile("emma.png"));

    await waitFor(() =>
      expect(
        within(panel).getByRole("img", { name: "Foto de Emma Vargas" }),
      ).toHaveAttribute("src", displayUrl(uploadedAssetId)),
    );
    expect(calls).toEqual([
      { method: "PUT", body: { imageAssetId: uploadedAssetId } },
    ]);
  });

  it("lets the Coordinator change the photo of someone she only reads", async () => {
    server.use(
      ...coordinatorHandlers(),
      listOf([emma, carolina]),
      ...photoHandlers(carolina.id, calls),
    );
    const { user } = renderAdmin("/estudio/personal");
    await user.click(
      await screen.findByRole("button", { name: "Carolina Rivas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Carolina Rivas" });

    expect(
      within(panel).getByRole("button", { name: "Cambiar foto" }),
    ).toBeVisible();
    expect(photoFileInput(panel)).toBeInTheDocument();
  });
});
