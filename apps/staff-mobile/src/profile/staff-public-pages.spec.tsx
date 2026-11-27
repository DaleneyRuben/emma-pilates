import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const trainer = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

// App Review 5.1.1(i): the privacy policy and support open from S23.
describe("Staff Perfil public pages", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // Follow-up 293: «Preguntas frecuentes» in «Ayuda», the policy in the footer.
  it("opens Preguntas frecuentes and the privacy policy on the studio's public pages", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const fetcher = routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([]),
      "/api/v1/staff-members/current": () => jsonResponse(trainer),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-profile")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preguntas frecuentes" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Preguntas frecuentes" }));
    await fireEvent.press(screen.getByRole("link", { name: "Política de privacidad" }));

    expect(openURL.mock.calls).toEqual([
      ["https://app.emmapilatesstudio.com/soporte"],
      ["https://app.emmapilatesstudio.com/privacidad"],
    ]);
    openURL.mockRestore();
  });
});
