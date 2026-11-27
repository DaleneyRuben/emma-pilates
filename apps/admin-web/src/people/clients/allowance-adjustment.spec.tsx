import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const adjustments: { classes: number; reason: string }[] = [];

describe("AW22 courtesy and class return", () => {
  useMockServer();
  beforeEach(() => {
    adjustments.length = 0;
    server.use(
      ...signedInHandlers(),
      acquisitionHandler(),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse(luciaDetail),
      ),
      http.post(
        apiUrl(`${clientsPath}/:clientId/allowance-adjustments`),
        async ({ request }) => {
          adjustments.push(
            (await request.json()) as { classes: number; reason: string },
          );
          return jsonResponse(
            {
              id: "aa000000-0000-5000-8000-000000000001",
              classes: adjustments[0]?.classes,
              reason: adjustments[0]?.reason,
            },
            201,
          );
        },
      ),
    );
  });

  // 2026-11-27: courtesy classes are no longer granted (owner decision).
  it("offers no courtesy class", async () => {
    const { user } = renderAdmin("/clientas");
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });
    await within(panel).findByRole("button", { name: "Devolver una clase" });
    expect(
      within(panel).queryByRole("button", { name: /cortesía/ }),
    ).not.toBeInTheDocument();
  });

  it("records a returned class", async () => {
    const { user } = renderAdmin("/clientas");
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });
    await user.click(
      await within(panel).findByRole("button", { name: "Devolver una clase" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: /clase devuelta/,
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar devolución" }),
    );

    await waitFor(() =>
      expect(adjustments).toEqual([{ classes: 1, reason: "class_return" }]),
    );
  });
});
