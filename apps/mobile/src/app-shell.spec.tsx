import { render } from "@testing-library/react-native";

import App from "../App";

describe("App", () => {
  it("starts with the unauthenticated navigation flow", async () => {
    const screen = await render(<App />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });
});
