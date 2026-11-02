import { NavigationContext } from "@react-navigation/native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { BrandToast, useStickyNotice } from "./brand-toast";

const hidden = { includeHiddenElements: true };

type Listener = () => void;

// The slice of a react-navigation screen's `navigation` the hook relies on.
function fakeNavigation() {
  const listeners: Record<string, Listener[]> = { blur: [] };
  return {
    emit: (type: "blur") => listeners[type]?.forEach((listener) => listener()),
    navigation: {
      addListener: (type: string, listener: Listener) => {
        listeners[type] = [...(listeners[type] ?? []), listener];
        return () => {
          listeners[type] = (listeners[type] ?? []).filter((item) => item !== listener);
        };
      },
    } as unknown as NonNullable<React.ContextType<typeof NavigationContext>>,
  };
}

// Follow-up 225 §7 and C05's «Reserva confirmada»: a Rosa profundo toast 16
// above the tab bar that stays until closed or the screen changes.
describe("BrandToast", () => {
  it("draws white text and a check on Rosa profundo, 16 above the tab bar", async () => {
    const screen = await render(
      <BrandToast
        note="Te quedan 9 clases en tu plan"
        onClose={jest.fn()}
        testID="toast"
        title="Reserva confirmada"
      />,
    );

    expect(screen.getByTestId("toast")).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#93615D",
      borderRadius: 14,
      bottom: 16,
      flexDirection: "row",
      gap: 12,
      left: 16,
      position: "absolute",
      right: 16,
    });
    expect(screen.getByText("Reserva confirmada")).toHaveStyle({
      color: "#FFFFFF",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 15,
    });
    expect(screen.getByText("Te quedan 9 clases en tu plan")).toHaveStyle({
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
    });
    const check = screen.getByTestId("glyph-check", hidden);
    expect(check).toHaveProp("stroke", "#FFFFFF");
    expect(check).toHaveProp("width", 20);
  });

  it("closes from a 44 pt ×", async () => {
    const onClose = jest.fn();
    const screen = await render(<BrandToast onClose={onClose} title="Pago aprobado" />);

    const close = screen.getByRole("button", { name: "Cerrar aviso" });
    expect(close).toHaveStyle({ height: 44, width: 44 });
    expect(screen.getByTestId("glyph-cross", hidden)).toHaveProp("stroke", "#FFFFFF");
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("glyph-check", hidden)).toBeOnTheScreen();
  });
});

function Probe({ dismiss, notice }: { dismiss: () => void; notice?: string }) {
  const shown = useStickyNotice(notice, dismiss);
  return shown === null ? null : <BrandToast onClose={dismiss} title={shown} />;
}

describe("useStickyNotice", () => {
  afterEach(() => jest.useRealTimers());

  it("never dismisses the notice on its own", async () => {
    const dismiss = jest.fn();
    const screen = await render(<Probe dismiss={dismiss} notice="Reserva confirmada" />);
    jest.useFakeTimers();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
  });

  it("dismisses the notice when the screen loses focus", async () => {
    const { emit, navigation } = fakeNavigation();
    const dismiss = jest.fn();
    await render(
      <NavigationContext.Provider value={navigation}>
        <Probe dismiss={dismiss} notice="Reserva confirmada" />
      </NavigationContext.Provider>,
    );

    await act(async () => emit("blur"));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("leaves a blur alone while there is no notice", async () => {
    const { emit, navigation } = fakeNavigation();
    const dismiss = jest.fn();
    const screen = await render(
      <NavigationContext.Provider value={navigation}>
        <Probe dismiss={dismiss} />
      </NavigationContext.Provider>,
    );

    await act(async () => emit("blur"));
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.toJSON()).toBeNull();
  });
});
