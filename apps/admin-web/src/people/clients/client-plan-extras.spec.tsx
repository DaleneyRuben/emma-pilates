import { screen, within } from "@testing-library/react";
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

const elena = {
  ...lucia,
  id: "33333333-3333-4333-8333-333333333333",
  name: "Elena Prueba",
  email: "elena@example.com",
  planName: "12 clases",
  remainingClassAllowance: 12,
  originalClassAllowance: 12,
  extraClasses: 0,
  planStartsOn: "2026-11-17",
  planEndsOn: "2026-12-16",
};

const rowOf = async (name: RegExp) =>
  (await screen.findByRole("cell", { name })).parentElement as HTMLElement;

// Walkthrough n.º 60 and 61 on AW21 and AW22: extra classes count with
// «Le quedan», and a spent Guest Pass gives way to the Plan she bought.
describe("AW21 and AW22 plan extras and the Plan after a Guest Pass", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), acquisitionHandler());
  });

  it("lists the extra classes and the Plan that starts later", async () => {
    server.use(
      http.get(apiUrl(clientsPath), () =>
        jsonResponse(clientPage([{ ...lucia, extraClasses: 1 }, elena])),
      ),
    );
    renderAdmin("/clientas");

    const luciaRow = await rowOf(/Lucía Fernández/);
    expect(within(luciaRow).getByText("5 de 8 + 1")).toBeInTheDocument();
    const elenaRow = await rowOf(/Elena Prueba/);
    expect(within(elenaRow).getByText("12 clases")).toBeInTheDocument();
    expect(
      within(elenaRow).getByText("Empieza el mar 17 nov"),
    ).toBeInTheDocument();
    expect(within(elenaRow).getByText("12 de 12")).toBeInTheDocument();
  });

  it("shows the extra classes and the next Plan on the Client summary", async () => {
    server.use(
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({
          ...luciaDetail,
          subscription: {
            ...luciaDetail.subscription,
            subscription: {
              ...luciaDetail.subscription.subscription!,
              extraClasses: 1,
            },
            nextSubscription: {
              id: "subscription-next",
              planName: "12 clases",
              originalClassAllowance: 12,
              remainingClassAllowance: 12,
              startsOn: "2026-10-01",
              endsOn: "2026-10-30",
            },
          },
        }),
      ),
    );
    const { user } = renderAdmin("/clientas");
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });

    expect(await within(panel).findByText("5 de 8 + 1")).toBeInTheDocument();
    expect(within(panel).getByText("Plan siguiente")).toBeInTheDocument();
    expect(
      within(panel).getByText("12 clases · empieza el jue 1 oct"),
    ).toBeInTheDocument();
  });
});
