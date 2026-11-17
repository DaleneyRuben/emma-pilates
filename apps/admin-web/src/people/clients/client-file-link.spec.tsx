import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import {
  feedbackPage,
  feedbackPath,
  problem,
} from "../../test/feedback-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientRow,
  clientsPath,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

// FIX-063 review: the link from Comentarios opens her file once, without
// trapping the browser's Back, and a link to nobody listed is forgotten.
const valeria = clientRow("Valeria Quiroga", {
  id: problem.senderClientId ?? "",
  email: problem.senderEmail,
});

describe("AW21 a link to a Client's file", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), acquisitionHandler());
    server.use(
      http.get(apiUrl(feedbackPath), () =>
        jsonResponse(feedbackPage([problem])),
      ),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([valeria]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({ ...luciaDetail, id: valeria.id, name: valeria.name }),
      ),
    );
  });

  it("goes back to Comentarios with one Back", async () => {
    const { router, user } = renderAdmin("/comentarios");
    await user.click(
      await screen.findByRole("link", { name: "Valeria Quiroga" }),
    );
    await screen.findByRole("dialog", { name: "Valeria Quiroga" });
    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty("cliente"),
    );

    router.history.back();

    await screen.findByRole("heading", { level: 1, name: "Comentarios" });
    expect(router.state.location.pathname).toBe("/comentarios");
  });

  it("forgets a linked Client the list does not show", async () => {
    const { router } = renderAdmin(
      "/clientas?q=nadie&cliente=c1000000-0000-5000-8000-000000000999",
    );
    await screen.findByRole("cell", { name: /Valeria Quiroga/ });

    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty("cliente"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
