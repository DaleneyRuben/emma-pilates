import { fireEvent, render, waitFor } from "@testing-library/react-native";

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
  fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  await waitFor(
    () => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );

  return screen;
}
