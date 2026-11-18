import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  feedbackPage,
  feedbackPath,
  problem,
  suggestion,
} from "../test/feedback-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientRow,
  clientsPath,
  luciaDetail,
} from "../test/people-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

// Walkthrough finding 88 (FIX-063): Comentarios says who sent each one, and a
// Client's name opens her file in Clientes.
const valeria = clientRow("Valeria Quiroga", {
  id: problem.senderClientId ?? "",
  email: problem.senderEmail,
});
const clientReads: URLSearchParams[] = [];

const rowOf = async (text: RegExp) => {
  await screen.findByRole("heading", { level: 1, name: "Comentarios" });
  return (await screen.findByRole("cell", { name: text }))
    .parentElement as HTMLElement;
};

describe("AW38 Comentarios names the sender", () => {
  useMockServer();
  beforeEach(() => {
    clientReads.length = 0;
    server.use(...signedInHandlers(), acquisitionHandler());
    server.use(
      http.get(apiUrl(feedbackPath), () =>
        jsonResponse(feedbackPage([problem, suggestion])),
      ),
      http.get(apiUrl(clientsPath), ({ request }) => {
        clientReads.push(new URL(request.url).searchParams);
        return jsonResponse(clientPage([valeria]));
      }),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({ ...luciaDetail, id: valeria.id, name: valeria.name }),
      ),
    );
  });

  it("adds «Enviado por»: a Client links to her file, a Staff Member is plain", async () => {
    renderAdmin("/comentarios");

    const fromClient = await rowOf(/No puedo ver mis reservas/);
    const link = within(fromClient).getByRole("link", {
      name: "Valeria Quiroga",
    });
    expect(link.closest("td")).toHaveAttribute("data-label", "Enviado por");
    expect(link).toHaveAttribute(
      "href",
      `/clientas?q=valeria%40example.com&cliente=${valeria.id}`,
    );
    const fromStaff = await rowOf(/Sería útil ver la lista/);
    expect(within(fromStaff).getByText("Emma Vargas")).toBeInTheDocument();
    expect(within(fromStaff).queryByRole("link")).not.toBeInTheDocument();
  });

  it("names the sender in the detail too", async () => {
    const { user } = renderAdmin("/comentarios");
    await rowOf(/Sería útil ver la lista/);
    await user.click(
      screen.getByRole("button", { name: /Sería útil ver la lista/ }),
    );
    const staffPanel = await screen.findByRole("dialog", {
      name: "Comentario",
    });
    expect(within(staffPanel).getByText("Enviado por")).toBeInTheDocument();
    expect(within(staffPanel).getByText("Emma Vargas")).toBeInTheDocument();
    // FIX-081: her Role reads in her gender.
    expect(within(staffPanel).getByText("Entrenadora")).toBeInTheDocument();
    await user.click(
      within(staffPanel).getByRole("button", { name: "Cerrar" }),
    );

    await user.click(
      await screen.findByRole("button", { name: /No puedo ver mis reservas/ }),
    );
    const clientPanel = await screen.findByRole("dialog", {
      name: "Comentario",
    });
    expect(
      within(clientPanel).getByRole("link", { name: "Valeria Quiroga" }),
    ).toHaveAttribute(
      "href",
      `/clientas?q=valeria%40example.com&cliente=${valeria.id}`,
    );
  });

  it("opens her file in Clientes from the link", async () => {
    const { user } = renderAdmin("/comentarios");
    const row = await rowOf(/No puedo ver mis reservas/);

    await user.click(
      within(row).getByRole("link", { name: "Valeria Quiroga" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Valeria Quiroga" }),
    ).toBeInTheDocument();
    expect(clientReads.at(-1)?.get("q")).toBe("valeria@example.com");
    expect(
      screen.queryByRole("dialog", { name: "Comentario" }),
    ).not.toBeInTheDocument();
  });

  it("names a sender without a client id, closed or from an older API, without a link", async () => {
    const olderApi: Partial<typeof problem> = { ...problem };
    delete olderApi.senderClientId;
    server.use(
      http.get(apiUrl(feedbackPath), () =>
        jsonResponse(
          feedbackPage([
            olderApi as typeof problem,
            { ...suggestion, senderName: "Cliente eliminado" },
          ]),
        ),
      ),
    );
    renderAdmin("/comentarios");

    const row = await rowOf(/No puedo ver mis reservas/);
    expect(within(row).getByText("Valeria Quiroga")).toBeInTheDocument();
    expect(within(row).queryByRole("link")).not.toBeInTheDocument();
  });
});
