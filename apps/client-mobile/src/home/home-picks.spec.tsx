import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";
import { formatTitleDate } from "@pilates/api-contracts";

import App from "../../App";
import { payment } from "../payments/purchase-test-support";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const today = boliviaCivilDate(new Date());
const profile = {
  id: "client-1",
  name: "Valeria Quispe",
  email: "valeria@example.com",
  phone: "+59170000000",
  referralCode: "REF-VALERIA",
};
const subscription = {
  id: "subscription-1",
  planName: "8 clases",
  originalClassAllowance: 8,
  remainingClassAllowance: 6,
  startsOn: addCivilDays(today, -5),
  endsOn: addCivilDays(today, 25),
};
const active = { status: "active", subscription };
const booking = {
  kind: "booking",
  bookingId: "booking-1",
  sessionId: "session-1",
  branchId: "branch-1",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  trainerPhoto: null,
  branchName: "Norte",
  startsAt: "2099-11-03T23:00:00.000Z",
  endsAt: "2099-11-03T23:50:00.000Z",
  capacity: 8,
  bookedCount: 3,
  attendeeInitials: ["LM", "SP"],
};

async function openHome(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(active),
          "/api/v1/promotions": () =>
            jsonResponse([
              {
                id: "promotion-1",
                headline: "Trae a una amiga en diciembre",
                description: "Su primera clase es gratis.",
                image: {
                  sources: [
                    {
                      url: "/api/v1/promotion-images/asset-1/promotion_960/version-1",
                      mediaType: "image/webp",
                      width: 960,
                      height: 540,
                    },
                  ],
                },
              },
            ]),
          ...routes,
        }),
      )}
    />,
  );
  await waitFor(() => expect(screen.getByText("Hola, Valeria")).toBeOnTheScreen());
  return screen;
}

type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null };

/** The test IDs among `ids` in screen order, top to bottom. */
function order(screen: Awaited<ReturnType<typeof openHome>>, ids: string[]) {
  const found: string[] = [];
  const walk = (node: Json | Json[] | string | null) => {
    if (node === null || typeof node === "string") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const id = node.props?.testID as string | undefined;
    if (id !== undefined && ids.includes(id) && !found.includes(id)) found.push(id);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as Json | Json[] | null);
  return found;
}

// C7 (owner 2026-11-19, pick A): the next class leads Inicio, with who is
// coming as Crema initials circles and the free places, then the promotion
// and «Reservar otra clase»; the bell, the avatar and the Plan row stay.
describe("Client Inicio with a booked class (C7 A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the next class first, then the promotion, then «Reservar otra clase»", async () => {
    const screen = await openHome({ "/api/v1/bookings": () => jsonResponse([booking]) });

    await waitFor(() => expect(screen.getByTestId("home-next-class")).toBeOnTheScreen());
    expect(
      order(screen, ["home-next-class", "promotions-carousel", "home-book", "home-plan-card"]),
    ).toEqual(["home-next-class", "promotions-carousel", "home-book", "home-plan-card"]);
    expect(screen.getByRole("button", { name: "Reservar otra clase" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Notificaciones/ })).toBeOnTheScreen();
  });

  it("says the free places and shows who is coming by initials", async () => {
    const screen = await openHome({ "/api/v1/bookings": () => jsonResponse([booking]) });

    const hero = await screen.findByTestId("home-next-class");
    expect(within(hero).getByText("5 de 8 libres")).toBeOnTheScreen();
    const circles = within(hero).getAllByTestId("hero-attendee");
    expect(circles.map((circle) => within(circle).getByText(/^[A-Z]+$/).props.children)).toEqual([
      "LM",
      "SP",
    ]);
    expect(circles[0]).toHaveStyle({ backgroundColor: "#FFFBFB" });
  });

  it("keeps «Reservar una clase» when nothing is booked", async () => {
    const screen = await openHome({ "/api/v1/bookings": () => jsonResponse([]) });

    expect(await screen.findByRole("button", { name: "Reservar una clase" })).toBeOnTheScreen();
    expect(screen.queryByTestId("home-next-class")).toBeNull();
  });
});

// C8 (owner 2026-11-19, A + C): a payment in review or rejected sits in one
// Palo de rosa block at the top, also while a Plan is active (a renewal).
describe("Client Inicio with a payment in review or rejected (C8 A + C)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts a renewal in review on top and keeps booking with the current Plan", async () => {
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse({ ...payment, planName: "Trimestral 24" }),
    });

    const notice = await screen.findByTestId("home-payment-card");
    expect(notice).toHaveStyle({ backgroundColor: "#93615D" });
    expect(within(notice).getByText("TU PAGO ESTÁ EN REVISIÓN")).toBeOnTheScreen();
    expect(within(notice).getByText("Trimestral 24")).toBeOnTheScreen();
    expect(
      within(notice).getByText(
        "Te avisamos apenas el estudio lo confirme. Mientras, sigues usando tu plan actual.",
      ),
    ).toBeOnTheScreen();
    expect(order(screen, ["home-payment-card", "promotions-carousel", "home-book"])).toEqual([
      "home-payment-card",
      "promotions-carousel",
      "home-book",
    ]);
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeEnabled();
    expect(screen.getByTestId("home-plan-card")).toBeOnTheScreen();
  });

  it("puts a rejected receipt on top with its reason and a Crema resend button", async () => {
    const screen = await openHome({
      "/api/v1/payments/current": () =>
        jsonResponse({
          ...payment,
          state: "rejected",
          planName: "Trimestral 24",
          rejectionReason: "El comprobante no corresponde al monto.",
        }),
    });

    const notice = await screen.findByTestId("home-payment-card");
    expect(within(notice).getByText("NO PUDIMOS CONFIRMAR TU PAGO")).toBeOnTheScreen();
    expect(within(notice).getByText("El comprobante no corresponde al monto.")).toBeOnTheScreen();
    // A renewal: she keeps her current plan meanwhile (review of C8).
    expect(
      within(notice).getByText(
        "Sube uno nuevo para activar tu renovación. Mientras, sigues usando tu plan actual.",
      ),
    ).toBeOnTheScreen();
    expect(within(notice).getByRole("button", { name: "Subir otro comprobante" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
    });
    // The block holds the one solid action, so booking turns secondary.
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
    });
  });
});

// C1 C (owner 2026-11-19): an approved Freeze that starts within a week, or
// is running, is said on Inicio with the day she is back.
describe("Client Inicio with a frozen plan (C1 C)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  const frozen = (startsOn: string, endsOn: string) => ({
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({
        ...active,
        freeze: { id: "freeze-1", state: "approved", startsOn, endsOn },
      }),
  });

  it("says the frozen days and the day she is back", async () => {
    const back = addCivilDays(today, 4);
    const screen = await openHome(frozen(addCivilDays(today, 1), addCivilDays(today, 3)));

    const notice = await screen.findByTestId("home-freeze-notice");
    expect(notice).toHaveStyle({ backgroundColor: "#93615D" });
    expect(within(notice).getByText("PLAN CONGELADO")).toBeOnTheScreen();
    expect(within(notice).getByText(/^Del /)).toBeOnTheScreen();
    const backDay = formatTitleDate(back).split(" de ")[0]!.toLowerCase();
    expect(
      within(notice).getByText(`No puedes reservar esos días. Vuelves el ${backDay}.`),
    ).toBeOnTheScreen();

    await fireEvent.press(notice);
    expect(await screen.findByRole("header", { name: "Mi plan" })).toBeOnTheScreen();
  });

  it("stays quiet for a Freeze more than a week away or already over", async () => {
    const far = await openHome(frozen(addCivilDays(today, 10), addCivilDays(today, 12)));
    expect(far.queryByTestId("home-freeze-notice")).toBeNull();
    await cleanup();
    clearMobileQueryCache();

    const over = await openHome(frozen(addCivilDays(today, -5), addCivilDays(today, -1)));
    expect(over.queryByTestId("home-freeze-notice")).toBeNull();
  });
});
