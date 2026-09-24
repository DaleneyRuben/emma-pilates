import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  barre,
  horario,
  promotionList,
  promotionsPath,
  reformer,
  verano,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const orderPath = `${promotionsPath}/order`;
const initial = [reformer, barre, horario, verano];

const headlines = () =>
  within(
    screen.getByRole("list", { name: "Promociones en el orden del carrusel" }),
  )
    .getAllByRole("article")
    .map((item) => item.getAttribute("aria-label"));

const handle = (headline: string) =>
  screen.getByRole("button", { name: `Mover ${headline}` });

// Every measured card sits 100 px below the previous one (80 px tall):
// jsdom has no layout, so the drag's hit-testing reads these rectangles.
const cardRect = (element: HTMLElement): DOMRect => {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-promotion-id]"),
  );
  const index = cards.indexOf(element.closest("[data-promotion-id]")!);
  const top = index * 100;
  return {
    top,
    bottom: top + 80,
    height: 80,
    left: 0,
    right: 600,
    width: 600,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
};

describe("AW17 drag to reorder (follow-up 39)", () => {
  useMockServer();
  const orders: unknown[] = [];
  let rects: jest.SpyInstance;
  beforeEach(() => {
    orders.length = 0;
    server.use(...signedInHandlers(), promotionList(initial));
    rects = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function measure(this: HTMLElement) {
        return cardRect(this);
      });
  });
  afterEach(() => rects.mockRestore());

  const orderHandler = (
    respond: (ids: string[]) => Response | Promise<Response>,
  ) =>
    http.put(apiUrl(orderPath), async ({ request }) => {
      const body = (await request.json()) as { promotionIds: string[] };
      orders.push(body);
      return respond(body.promotionIds);
    });

  const reordered = (ids: string[]) =>
    ids.map((id, index) => ({
      ...initial.find((item) => item.id === id)!,
      displayOrder: index + 1,
    }));

  it("drags a card by its handle to a new position and saves the whole order on drop", async () => {
    server.use(orderHandler((ids) => jsonResponse(reordered(ids))));
    const { user } = renderAdmin("/promociones");
    await screen.findByRole("article", { name: reformer.headline });

    await user.pointer([
      {
        keys: "[MouseLeft>]",
        target: handle(reformer.headline),
        coords: { x: 10, y: 40 },
      },
      { coords: { x: 10, y: 250 } },
    ]);

    // Lifted card, the others dimmed, and the insertion line named.
    const lifted = screen.getByRole("article", { name: reformer.headline });
    expect(lifted).toHaveAttribute("data-dragging", "true");
    expect(
      screen.getByRole("article", { name: barre.headline }),
    ).toHaveAttribute("data-dimmed", "true");
    expect(screen.getByText("Soltar en posición 3")).toBeVisible();
    expect(orders).toEqual([]);

    await user.pointer([{ keys: "[/MouseLeft]", coords: { x: 10, y: 250 } }]);

    await waitFor(() =>
      expect(orders).toEqual([
        { promotionIds: [barre.id, horario.id, reformer.id, verano.id] },
      ]),
    );
    expect(headlines()).toEqual([
      barre.headline,
      horario.headline,
      reformer.headline,
      verano.headline,
    ]);
    // Positions renumber on drop; no two cards ever share one.
    expect(
      within(
        screen.getByRole("article", { name: reformer.headline }),
      ).getByText("Posición 3"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: barre.headline })).getByText(
        "Posición 1",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Soltar en posición/)).not.toBeInTheDocument();
    expect(lifted).not.toHaveAttribute("data-dragging");
  });

  it("drops a card back where it was without saving", async () => {
    server.use(orderHandler((ids) => jsonResponse(reordered(ids))));
    const { user } = renderAdmin("/promociones");
    await screen.findByRole("article", { name: reformer.headline });

    await user.pointer([
      {
        keys: "[MouseLeft>]",
        target: handle(barre.headline),
        coords: { x: 10, y: 140 },
      },
      { coords: { x: 10, y: 150 } },
      { keys: "[/MouseLeft]", coords: { x: 10, y: 150 } },
    ]);

    expect(headlines()).toEqual(initial.map((item) => item.headline));
    expect(orders).toEqual([]);
  });

  it("moves a card from the keyboard: take it with the space bar, move it with the arrows, and drop it", async () => {
    server.use(orderHandler((ids) => jsonResponse(reordered(ids))));
    const { user } = renderAdmin("/promociones");
    await screen.findByRole("article", { name: reformer.headline });

    handle(horario.headline).focus();
    await user.keyboard(" ");
    expect(handle(horario.headline)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Horario de fin de año tomada en la posición 3. Usa las flechas para moverla y la barra espaciadora para soltarla.",
    );
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(headlines()).toEqual([
      horario.headline,
      reformer.headline,
      barre.headline,
      verano.headline,
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Horario de fin de año en la posición 1 de 4.",
    );
    expect(orders).toEqual([]);

    await user.keyboard(" ");

    await waitFor(() =>
      expect(orders).toEqual([
        { promotionIds: [horario.id, reformer.id, barre.id, verano.id] },
      ]),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Horario de fin de año soltada en la posición 1. Orden guardado.",
    );
    expect(handle(horario.headline)).toHaveAttribute("aria-pressed", "false");
    expect(handle(horario.headline)).toHaveFocus();
  });

  it("puts a card back when the keyboard move is cancelled with Escape", async () => {
    server.use(orderHandler((ids) => jsonResponse(reordered(ids))));
    const { user } = renderAdmin("/promociones");
    await screen.findByRole("article", { name: reformer.headline });

    handle(verano.headline).focus();
    await user.keyboard(" {ArrowUp}");
    expect(headlines()).toEqual([
      reformer.headline,
      barre.headline,
      verano.headline,
      horario.headline,
    ]);

    await user.keyboard("{Escape}");

    expect(headlines()).toEqual(initial.map((item) => item.headline));
    expect(orders).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Movimiento cancelado: Semana de puertas abiertas sigue en la posición 4.",
    );
  });

  it("restores the saved order and says so when the backend refuses the new one", async () => {
    server.use(
      orderHandler(() => problemResponse(409, "promotion_order_incomplete")),
    );
    const { user } = renderAdmin("/promociones");
    await screen.findByRole("article", { name: reformer.headline });

    handle(reformer.headline).focus();
    await user.keyboard(" {ArrowDown} ");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el orden: la lista cambió. Vuelve a intentarlo.",
    );
    await waitFor(() =>
      expect(headlines()).toEqual(initial.map((item) => item.headline)),
    );
  });
});
