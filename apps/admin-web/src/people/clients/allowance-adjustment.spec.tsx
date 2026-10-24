import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

  it("records a courtesy class on the Client's current Plan", async () => {
    const { user } = renderAdmin("/back-office/clientes");
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });
    await user.click(
      await within(panel).findByRole("button", {
        name: "Agregar clase de cortesía",
      }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: /clase de cortesía/,
    });
    fireEvent.change(
      within(dialog).getByRole("spinbutton", { name: "Clases" }),
      {
        target: { value: "1" },
      },
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar cortesía" }),
    );

    await waitFor(() =>
      expect(adjustments).toEqual([{ classes: 1, reason: "courtesy" }]),
    );
  });

  it("records a returned class", async () => {
    const { user } = renderAdmin("/back-office/clientes");
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
