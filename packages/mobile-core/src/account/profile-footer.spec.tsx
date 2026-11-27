import { fireEvent, render } from "@testing-library/react-native";

import { textVariants } from "../ui/type-scale";
import { ProfileFooter } from "./profile-footer";

// Follow-up 293 (C18s, E-F24): Perfil ends in two quiet lines straight on
// Fondo, the version and the links, in texto-pie at 12 regular.
describe("ProfileFooter", () => {
  const links = [
    { label: "Política de privacidad", onPress: jest.fn(), testID: "profile-privacy" },
    { label: "Cerrar mi cuenta", onPress: jest.fn(), testID: "profile-close-account" },
  ];

  it("names the studio and the version on the first line, in pie", async () => {
    const screen = await render(<ProfileFooter links={links} version="1.3.0" />);

    expect(screen.getByText("Emma Pilates Studio · versión 1.3.0")).toHaveStyle({
      ...textVariants.pie,
      color: "#8A5B57",
      textAlign: "center",
    });
  });

  it("sits on the page with no card, 16 pt under the card before it", async () => {
    const screen = await render(<ProfileFooter links={links} screenGap={10} version="1.3.0" />);

    const footer = screen.getByTestId("profile-footer");
    expect(footer).toHaveStyle({ alignItems: "center", gap: 2, marginTop: 6, paddingVertical: 4 });
    expect(footer).not.toHaveStyle({ backgroundColor: "#FFFBFB" });
  });

  it("draws the links on one line, underlined at regular weight, split by a dot", async () => {
    const screen = await render(<ProfileFooter links={links} version="1.3.0" />);

    expect(screen.getByTestId("profile-footer-links")).toHaveStyle({ flexDirection: "row" });
    for (const label of ["Política de privacidad", "Cerrar mi cuenta"]) {
      expect(screen.getByText(label)).toHaveStyle({
        ...textVariants["enlace-pie"],
        color: "#8A5B57",
      });
    }
    expect(screen.getByText(" · ")).toHaveStyle({ ...textVariants.pie, color: "#8A5B57" });
  });

  it("draws a single link with no dot", async () => {
    const screen = await render(<ProfileFooter links={links.slice(0, 1)} version="1.3.0" />);

    expect(screen.getByText("Política de privacidad")).toBeOnTheScreen();
    expect(screen.queryByText(" · ")).toBeNull();
  });

  it("gives each link a 44 pt touch area and opens it when pressed", async () => {
    const screen = await render(<ProfileFooter links={links} version="1.3.0" />);

    for (const link of links) {
      const button = screen.getByRole("link", { name: link.label });
      expect(button).toBe(screen.getByTestId(link.testID));
      const slop = button.props.hitSlop as { bottom: number; top: number };
      expect(textVariants.pie.lineHeight + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
      await fireEvent.press(button);
      expect(link.onPress).toHaveBeenCalledTimes(1);
    }
  });
});
