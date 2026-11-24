import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

export const profile = {
  id: "client-1",
  name: "Sofía Guzmán",
  email: "sofia@example.com",
  phone: "+591 70011004",
  referralCode: "REF-SOFIA",
  photo: null,
};

export const expired = {
  status: "expired",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 3,
    startsOn: "2026-08-12",
    endsOn: "2026-09-11",
  },
};

export const readRoutes = {
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () => jsonResponse(expired),
};

export async function openProfile(runtime = createClientRuntime(routeFetcher(readRoutes))) {
  const screen = await render(<App runtime={runtime} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  await waitFor(
    () => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );

  return screen;
}

/** The window of an iPad in portrait (follow-up 289); `jest.restoreAllMocks` undoes it. */
export function mockTabletWindow(width = 834) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

/** Opens Perfil from the tablet's tab bar, which screen readers reach by its test ID. */
export async function openProfileOnTablet(runtime = createClientRuntime(routeFetcher(readRoutes))) {
  mockTabletWindow();
  const screen = await render(<App runtime={runtime} />);
  const hidden = { includeHiddenElements: true };

  await waitFor(() => expect(screen.getByTestId("tab-profile", hidden)).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile", hidden));
  await waitFor(() => expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen(), {
    timeout: 5_000,
  });
  return screen;
}
