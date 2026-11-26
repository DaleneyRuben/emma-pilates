import { fireEvent, render } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { Screen, ScreenHeader, ScreenTopBar, WideScreens } from "../index";
import { spacing } from "./tokens";
import { textVariants } from "./type-scale";
import { Text } from "./text";

// Rosa Emma (follow-up 284): one header for both apps — a 200 band with the
// back button on its own row, then the screen's large Lora title under it.
const metrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};
describe("ScreenHeader", () => {
  it("puts the back arrow on its own row above a titulo-pagina title", async () => {
    const onBack = jest.fn();
    const screen = await render(<ScreenHeader onBack={onBack} title="Mi plan" />);

    expect(screen.getByRole("header", { name: "Mi plan" })).toHaveStyle({
      ...textVariants["titulo-pagina"],
      color: "#93615D",
    });
    const back = screen.getByRole("button", { name: "Volver" });
    expect(back).toHaveStyle({ height: 44, width: 44 });
    await fireEvent.press(back);
    expect(onBack).toHaveBeenCalled();
  });

  it("draws no rule under the title", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Mi plan" />);

    expect(screen.getByTestId("screen-header")).not.toHaveStyle({ borderBottomWidth: 1 });
  });

  it("keeps the chevron inside the content edge, so a scroll view never clips it", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Reformer" />);

    expect(screen.getByRole("button", { name: "Volver" })).not.toHaveStyle({ marginLeft: -10 });
  });

  it("draws only the title on a tab's root screen", async () => {
    const screen = await render(<ScreenHeader title="Mis reservas" />);

    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
    expect(screen.getByRole("header", { name: "Mis reservas" })).toBeOnTheScreen();
  });

  it("puts an action at the end of the arrow's row and a quiet line under the title", async () => {
    const screen = await render(
      <ScreenHeader
        action={<Text variant="destacado">Marcar leídas</Text>}
        onBack={jest.fn()}
        subtitle="3 sin leer"
        title="Notificaciones"
      />,
    );

    expect(screen.getByText("Marcar leídas")).toBeOnTheScreen();
    expect(screen.getByText("3 sin leer")).toHaveStyle({
      ...textVariants.compacto,
      color: "#93615D",
    });
    expect(screen.getByText("3 sin leer").parent).toHaveStyle({ backgroundColor: "#FFFBFB" });
  });

  it("draws a 200 band with rounded lower corners and a white back disc", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      backgroundColor: "#E7CCBF",
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      paddingHorizontal: 16,
    });
    expect(screen.getByRole("button", { name: "Volver" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 22,
    });
  });

  it("reaches past a padded Screen's padding and top safe area to its edges", async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <ScreenHeader onBack={jest.fn()} title="Mi plan" />
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      marginHorizontal: -spacing.lg,
      marginTop: -(spacing.lg + 47),
      paddingTop: spacing.lg + 47,
    });
  });

  it("reaches through its parent screen's top padding when nested in a pane", async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <Screen>
            <ScreenHeader onBack={jest.fn()} title="Lucía Fernández" />
          </Screen>
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      marginTop: -(spacing.lg + spacing.lg + 47),
    });
  });

  it("puts the eyebrow on a white capsule and an accessory at the end of the title", async () => {
    const screen = await render(
      <ScreenHeader
        eyebrow="Instructora · Jueves 19"
        title="Hola, Daniela"
        titleAccessory={<Text variant="destacado">Campana</Text>}
      />,
    );

    expect(screen.getByText("Instructora · Jueves 19")).toHaveStyle(textVariants.etiqueta);
    expect(screen.getByText("Instructora · Jueves 19").parent).toHaveStyle({
      backgroundColor: "#FFFBFB",
    });
    expect(screen.getByText("Campana")).toBeOnTheScreen();
  });
});

// Follow-up 289 (02T): a tablet page can keep the band's content in its column.
describe("ScreenHeader's tablet width", () => {
  afterEach(() => jest.restoreAllMocks());

  const header = <ScreenHeader eyebrow="Jueves 19" tabletWidth={720} title="Hola, Carla" />;

  it("centres the band's content at that width on a tablet page", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width: 834 });
    const screen = await render(header, { wrapper: WideScreens });

    expect(screen.getByTestId("screen-header-content")).toHaveStyle({
      alignSelf: "center",
      gap: spacing.md,
      maxWidth: 720,
    });
  });

  it("adds nothing on a phone or outside a tablet page", async () => {
    const phone = await render(header, { wrapper: WideScreens });
    expect(phone.queryByTestId("screen-header-content")).toBeNull();

    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width: 834 });
    const staff = await render(header);
    expect(staff.queryByTestId("screen-header-content")).toBeNull();
  });
});

describe("ScreenTopBar", () => {
  it("pads the band 16 pt on each side (walkthrough n.º 8)", async () => {
    const bare = await render(<ScreenTopBar onBack={jest.fn()} title="Recuperar contraseña" />);
    expect(bare.getByTestId("screen-top-bar")).toHaveStyle({ paddingHorizontal: 16 });
  });

  it("is the shared header", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByRole("header", { name: "Mi crédito" })).toHaveStyle(
      textVariants["titulo-pagina"],
    );
  });
});
