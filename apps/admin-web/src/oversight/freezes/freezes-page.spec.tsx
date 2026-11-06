import type { FreezeReviewDto } from "@pilates/api-contracts";
import { screen } from "@testing-library/react";
import { http } from "msw";
import {
  expectClientInitials,
  expectClientPhoto,
  herPhoto,
} from "../../test/client-photo-fixtures";
import { freezesPath } from "../../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const freeze = (
  id: string,
  clientName: string,
  extra: Partial<FreezeReviewDto> = {},
): FreezeReviewDto => ({
  id,
  clientName,
  clientPhoto: null,
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
  ...extra,
});

describe("Congelamientos", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("FIX-041 shows a Client's photo, or her initials without one", async () => {
    server.use(
      http.get(apiUrl(freezesPath), () =>
        jsonResponse([
          freeze("freeze-1", "Valeria Quiroga", { clientPhoto: herPhoto }),
          freeze("freeze-2", "Daniela Rojas"),
        ]),
      ),
    );
    renderAdmin("/clientas/congelamientos");

    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    expectClientPhoto(row, "Valeria Quiroga");
    const without = screen
      .getByText("Daniela Rojas")
      .closest("tr") as HTMLElement;
    expectClientInitials(without, "Daniela Rojas", "DR");
  });
});
