import { render } from "@testing-library/react-native";

import { TeamAccessBadge } from "../auth/auth-layout";
import { TextButton } from "./text-button";

// Follow-up 70: text on a tint reads in Palo de rosa sobre tinte.
describe("text on a tint", () => {
  it("lets a text link sit on Palo de rosa tinte", async () => {
    const screen = await render(
      <TextButton label="Reenviar correo" onPress={jest.fn()} tone="onTint" />,
    );

    expect(screen.getByText("Reenviar correo")).toHaveStyle({ color: "#7A4F4B" });
  });

  it("draws the team access pill in the on-tint tone", async () => {
    const screen = await render(<TeamAccessBadge />);

    expect(screen.getByText("Acceso del equipo")).toHaveStyle({ color: "#7A4F4B" });
  });
});
