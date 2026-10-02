import { cleanup, render, within } from "@testing-library/react-native";

import { ChangePasswordScreen } from "../account/change-password-screen";
import { NotificationsScreen } from "../notifications/notifications-screen";
import { clearMobileQueryCache, MobileQueryProvider } from "../query/provider";

const unread = {
  items: [
    {
      id: "n1",
      category: "booking_schedule",
      type: "session_cancelled",
      title: "Aviso",
      message: "Se canceló tu clase.",
      createdAt: "2026-09-22T14:00:00.000Z",
      readAt: null,
      target: null,
    },
  ],
  nextCursor: null,
  unreadCount: 1,
};

const fetcher = jest.fn(() =>
  Promise.resolve(
    new Response(JSON.stringify(unread), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  ),
) as unknown as typeof globalThis.fetch;

// MOB-034: 19/S20 and 23/S23 draw the export's top bar, not «← Volver».
describe("The shared account screens' top bar", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("titles Notificaciones in the bar with «Marcar leídas» beside it", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <NotificationsScreen emptySupport="" fetcher={fetcher} onBack={jest.fn()} />
      </MobileQueryProvider>,
    );

    const bar = await screen.findByTestId("screen-top-bar");
    expect(within(bar).getByLabelText("Notificaciones")).toBeOnTheScreen();
    expect(
      await within(bar).findByRole("button", { name: "Marcar leídas" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("← Volver")).toBeNull();
  });

  it("titles Cambiar contraseña in the bar", async () => {
    const screen = await render(
      <ChangePasswordScreen fetcher={jest.fn()} onBack={jest.fn()} onSaved={jest.fn()} />,
    );

    const bar = screen.getByTestId("screen-top-bar");
    expect(within(bar).getByLabelText("Cambiar contraseña")).toBeOnTheScreen();
    expect(screen.queryByText("← Volver")).toBeNull();
  });
});
