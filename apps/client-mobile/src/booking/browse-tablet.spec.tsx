import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  branch,
  classType,
  detail,
  listed,
  profile,
  subscription,
} from "./session-detail-test-support";

jest.setTimeout(20_000);

type Element = ReturnType<Awaited<ReturnType<typeof render>>["getByTestId"]>;

const hidden = { includeHiddenElements: true };
const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const listUrl = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

function windowSize(width: number, height: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height, scale: 2, width });
}

/** The nearest host row above an element, such as the band's title row. */
function rowAround(element: Element): Element {
  let node: Element | null = element.parent;
  while (node !== null) {
    const style = [node.props.style].flat(Infinity) as ({ flexDirection?: string } | null)[];
    if (typeof node.type === "string" && style.some((part) => part?.flexDirection === "row")) {
      return node;
    }
    node = node.parent;
  }
  throw new Error("no row");
}

async function openReservar(routes: Parameters<typeof routeFetcher>[0] = {}) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(subscription(5)),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [listUrl]: () => jsonResponse([listed(3)]),
    "/api/v1/sessions/session-1": () => jsonResponse(detail(3)),
    ...routes,
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByTestId("tab-booking", hidden)).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-booking", hidden));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen(),
  );
  return { fetcher, screen };
}

// Follow-up 289 (03T/04T): on a tablet Reservar is the S04 split. The list
// panel holds the days, the Class Types and the classes; the chosen class
// opens beside it with its action at the panel's foot.
describe("Reservar on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("lays out the band, the list panel and «Elige una clase»", async () => {
    windowSize(834, 1194);
    const { screen } = await openReservar();

    expect(screen.getByTestId("split-panels")).toHaveStyle({
      flexDirection: "row",
      marginHorizontal: -40,
    });
    expect(screen.getByTestId("split-panels-list")).toHaveStyle({ width: 392 });
    const list = within(screen.getByTestId("split-panels-list"));
    expect(list.getByTestId("browse-day-strip")).toBeOnTheScreen();
    expect(list.getByTestId("browse-class-type-strip")).toHaveStyle({ flexWrap: "wrap" });
    expect(list.getByTestId("browse-day-header")).toBeOnTheScreen();
    // The days left the band; the Branch rides there as a pill, under the title.
    const band = within(screen.getByTestId("browse-header"));
    expect(band.queryByTestId("browse-day-strip")).toBeNull();
    expect(band.getByText("Sucursal: Centro")).toBeOnTheScreen();
    const title = screen.getByRole("header", { name: "Reservar" });
    expect(within(rowAround(title)).queryByTestId("browse-band-pills")).toBeNull();

    const empty = within(screen.getByTestId("session-panel-empty"));
    expect(empty.getByText("Elige una clase")).toBeOnTheScreen();
    expect(
      empty.getByText("Toca una clase de la lista para ver el detalle y reservarla aquí."),
    ).toBeOnTheScreen();
  });

  it("opens the chosen class beside the list and books from there", async () => {
    windowSize(834, 1194);
    const booked = jest.fn(() => jsonResponse({ id: "booking-1" }, 201));
    const { screen } = await openReservar({ "POST /api/v1/sessions/session-1/bookings": booked });

    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    const detail = within(screen.getByTestId("split-panels-detail"));
    await waitFor(() => expect(detail.getByText("Sobre la clase")).toBeOnTheScreen());
    // The row stays in the list, marked; the class has no back button.
    expect(screen.getByTestId("session-row-session-1")).toHaveStyle({
      backgroundColor: "#FEF6F2",
    });
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    expect(detail.queryByTestId("back-bar")).toBeNull();
    expect(detail.getByTestId("session-footer")).toHaveStyle({
      marginHorizontal: -24,
      paddingHorizontal: 24,
    });

    await fireEvent.press(detail.getByRole("button", { name: "Reservar esta clase" }));
    await waitFor(() => expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen());
    expect(booked).toHaveBeenCalledTimes(1);
  });

  it("puts the title and the pills on one row on a landscape tablet", async () => {
    windowSize(1194, 834);
    const { screen } = await openReservar();

    const title = screen.getByRole("header", { name: "Reservar" });
    expect(within(rowAround(title)).getByTestId("browse-band-pills")).toBeOnTheScreen();
    expect(screen.getByTestId("split-panels-list")).toHaveStyle({ width: 392 });
  });

  it("keeps the phone's list and pushes the detail under 768 pt", async () => {
    windowSize(390, 844);
    const { screen } = await openReservar();

    expect(screen.queryByTestId("split-panels")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() => expect(screen.getByText("Sobre la clase")).toBeOnTheScreen());
    expect(screen.getByTestId("back-bar")).toBeOnTheScreen();
  });
});
