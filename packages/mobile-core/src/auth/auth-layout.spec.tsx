import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthenticationScreen } from "./auth-layout";

// Verification n.º 46 (design follow-up 256 § 4): a short screen with an
// outcome badge («Revisa tu correo», an expired link, an active account)
// centres its badge, title, text and buttons as one block, instead of
// leaving half the screen empty below them.
describe("AuthenticationScreen", () => {
  it("centres a badge screen's block vertically", async () => {
    const screen = await render(
      <AuthenticationScreen
        badge={{ icon: "mail", tone: "primary" }}
        brand={false}
        title="Revisa tu correo"
      >
        <Text>Te enviamos un enlace</Text>
      </AuthenticationScreen>,
    );

    expect(screen.getByTestId("authentication-panel")).toHaveStyle({
      flexGrow: 1,
      justifyContent: "center",
    });
  });

  it("keeps a form screen's panel at the top", async () => {
    const screen = await render(
      <AuthenticationScreen title="Crea tu contraseña">
        <Text>Elige una contraseña</Text>
      </AuthenticationScreen>,
    );

    expect(screen.getByTestId("authentication-panel")).not.toHaveStyle({
      justifyContent: "center",
    });
  });
});
