import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthenticationScreen } from "./auth-layout";

// Rosa Emma (C01c, C21b, E-A07): on the client the outcome sits on the band
// and its text in the white card under it; the staff boards draw the outcome
// inside the card, centred, with its actions.
describe("AuthenticationScreen", () => {
  it("draws a client outcome on the band and its text in a white card", async () => {
    const screen = await render(
      <AuthenticationScreen
        actions={<Text>Iniciar sesión</Text>}
        badge={{ icon: "mail", tone: "primary" }}
        brand={false}
        title="Revisa tu correo"
      >
        <Text>Te enviamos un enlace</Text>
      </AuthenticationScreen>,
    );

    expect(screen.getByTestId("screen-header")).toContainElement(
      screen.getByText("Revisa tu correo"),
    );
    const panel = screen.getByTestId("authentication-panel");
    expect(panel).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 20 });
    expect(panel).toContainElement(screen.getByText("Te enviamos un enlace"));
    expect(panel).not.toContainElement(screen.getByText("Iniciar sesión"));
  });

  it("draws a staff outcome and its actions inside the card", async () => {
    const screen = await render(
      <AuthenticationScreen
        actions={<Text>Ir a iniciar sesión</Text>}
        badge={{ icon: "check", tone: "success" }}
        staff
        title="Tu cuenta está activa"
      >
        <Text>Tu correo quedó verificado.</Text>
      </AuthenticationScreen>,
    );

    const panel = screen.getByTestId("authentication-panel");
    expect(panel).toHaveStyle({ alignItems: "center" });
    expect(panel).toContainElement(screen.getByText("Tu cuenta está activa"));
    expect(panel).toContainElement(screen.getByText("Ir a iniciar sesión"));
  });

  it("keeps a form screen's title in its card", async () => {
    const screen = await render(
      <AuthenticationScreen title="Crea tu contraseña">
        <Text>Elige una contraseña</Text>
      </AuthenticationScreen>,
    );

    expect(screen.getByTestId("authentication-panel")).toContainElement(
      screen.getByText("Crea tu contraseña"),
    );
    expect(screen.getByText("Crea tu contraseña")).toHaveStyle({ fontSize: 26 });
  });
});
