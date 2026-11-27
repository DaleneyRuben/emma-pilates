import { fireEvent, render } from "@testing-library/react-native";

import { textVariants } from "../ui/type-scale";
import { LogoutCard } from "./logout-card";

const hidden = { includeHiddenElements: true };

// Follow-up 292 (C18s, E-F23): «Cerrar sesión» is a white card of its own,
// centred, in Destructivo, 24 pt below the card before it.
describe("LogoutCard", () => {
  it("is a white card with the icon and the label centred in Destructivo", async () => {
    const screen = await render(<LogoutCard onPress={jest.fn()} />);

    const card = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(card).toBe(screen.getByTestId("profile-logout"));
    expect(card).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      marginTop: 12,
      minHeight: 52,
    });
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({
      ...textVariants.boton,
      color: "#A04640",
    });
    const glyph = screen.getByTestId("glyph-logout", hidden);
    expect(glyph).toHaveProp("stroke", "#A04640");
    expect(glyph).toHaveProp("width", 20);
  });

  it("asks to log out when pressed", async () => {
    const onPress = jest.fn();
    const screen = await render(<LogoutCard onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps 24 pt above it on a screen whose cards stand 10 pt apart", async () => {
    const screen = await render(<LogoutCard onPress={jest.fn()} screenGap={10} />);

    expect(screen.getByTestId("profile-logout")).toHaveStyle({ marginTop: 14 });
  });
});
