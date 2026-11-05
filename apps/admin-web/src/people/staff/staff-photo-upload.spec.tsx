import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { imageFile } from "../../test/image-stubs";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  paolaMember,
  referralCodeHandler,
  rita,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import { openMember } from "../../test/staff-panel-support";
import {
  deferred,
  displayUrl,
  photoFileInput,
  photoHandlers,
  type PhotoCalls,
} from "../../test/staff-photo-support";
import { signedInHandlers } from "../../test/session-handlers";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../../test/upload-fixtures";

const fileLine = "JPG, PNG o WebP, hasta 10 MB.";

// FIX-041 (follow-ups 242, 247): the member panel's photo block saves the
// photo the moment its upload finishes, apart from «Guardar».
describe("the member panel's photo upload", () => {
  useMockServer();
  const seen: UploadSeen = { polls: 0 };
  const calls: PhotoCalls = [];
  let listReads = 0;
  beforeEach(() => {
    seen.polls = 0;
    seen.declared = undefined;
    calls.length = 0;
    listReads = 0;
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      referralCodeHandler(),
      http.get(apiUrl(staffMembersPath), () => {
        listReads += 1;
        return jsonResponse(staffPage([emma, paolaMember, rita, valentina]));
      }),
    );
  });

  it("uploads the chosen photo and saves it on the member at once", async () => {
    const { gate, open } = deferred();
    server.use(
      ...uploadHandlers(seen),
      ...photoHandlers(emma.id, calls, { gate }),
    );
    const { panel, user } = await openMember("Emma Vargas");

    expect(within(panel).getByText(fileLine)).toBeVisible();
    expect(within(panel).getByText("EV")).toBeVisible();
    expect(
      within(panel).queryByRole("button", { name: "Quitar foto" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByText(/Se recorta al centro/),
    ).not.toBeInTheDocument();
    const readsBefore = listReads;

    await user.upload(photoFileInput(panel), imageFile("emma.png"));

    expect(await within(panel).findByText("Subiendo foto…")).toBeVisible();
    expect(
      within(panel).getByRole("img", { name: "Foto de Emma Vargas" }),
    ).toHaveAttribute("src", expect.stringContaining("emma.png"));
    expect(
      within(panel).queryByRole("button", { name: "Cambiar foto" }),
    ).not.toBeInTheDocument();
    open();

    await waitFor(() =>
      expect(
        within(panel).getByRole("img", { name: "Foto de Emma Vargas" }),
      ).toHaveAttribute("src", displayUrl(uploadedAssetId)),
    );
    expect(seen.declared).toMatchObject({ purpose: "profile_photo" });
    expect(calls).toEqual([
      { method: "PUT", body: { imageAssetId: uploadedAssetId } },
    ]);
    expect(
      within(panel).getByRole("button", { name: "Quitar foto" }),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Cambiar foto" }),
    ).toBeVisible();
    await waitFor(() => expect(listReads).toBeGreaterThan(readsBefore));
    // The rest of the form is still unsaved and the panel stays open.
    expect(
      screen.getByRole("dialog", { name: "Editar miembro" }),
    ).toBeInTheDocument();
  });

  it("refuses a file over 10 MB before uploading it", async () => {
    server.use(...uploadHandlers(seen), ...photoHandlers(emma.id, calls));
    const { panel, user } = await openMember("Emma Vargas");
    const big = imageFile("enorme.jpg", "image/jpeg");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });

    await user.upload(photoFileInput(panel), big);

    expect(
      await within(panel).findByText(
        "Elige una foto JPG, PNG o WebP de hasta 10 MB.",
      ),
    ).toBeVisible();
    expect(seen.declared).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it("says the upload failed and keeps the initials", async () => {
    server.use(
      ...uploadHandlers(seen, ["failed"]),
      ...photoHandlers(emma.id, calls),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.upload(photoFileInput(panel), imageFile("emma.png"));

    expect(
      await within(panel).findByText(
        "No pudimos subir la foto. Inténtalo de nuevo.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("EV")).toBeVisible();
    expect(
      within(panel).queryByRole("img", { name: "Foto de Emma Vargas" }),
    ).not.toBeInTheDocument();
    expect(calls).toEqual([]);
    expect(
      within(panel).getByRole("button", { name: "Cambiar foto" }),
    ).toBeVisible();
  });
});
