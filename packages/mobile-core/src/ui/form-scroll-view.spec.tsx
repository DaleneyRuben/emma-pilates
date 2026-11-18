import { act, fireEvent, render } from "@testing-library/react-native";
import { DeviceEventEmitter, Platform, ScrollView, Text } from "react-native";

import { FormScrollView } from "./form-scroll-view";

async function showKeyboard(screenY: number) {
  await act(async () => {
    DeviceEventEmitter.emit(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", {
      endCoordinates: { height: 800 - screenY, screenX: 0, screenY, width: 400 },
    });
  });
}

async function renderForm() {
  const screen = await render(
    <FormScrollView testID="form">
      <Text>Correo electrónico</Text>
    </FormScrollView>,
  );
  await fireEvent(screen.getByTestId("form"), "layout", {
    nativeEvent: { layout: { height: 800, width: 400, x: 0, y: 0 } },
    persist: () => undefined,
  });
  return screen;
}

// MOB-058: under Android edge-to-edge the window no longer resizes for the
// keyboard, so the form itself must make room on both platforms.
describe.each(["ios", "android"] as const)("FormScrollView on %s", (os) => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", os);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lifts the form above the keyboard", async () => {
    const screen = await renderForm();

    await showKeyboard(500);

    expect(screen.getByTestId("form")).toHaveStyle({ paddingBottom: 300 });
  });

  it("gives the room back when the keyboard hides", async () => {
    const screen = await renderForm();
    await showKeyboard(500);

    await act(async () => {
      DeviceEventEmitter.emit(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", null);
    });

    expect(screen.getByTestId("form")).toHaveStyle({ paddingBottom: 0 });
  });

  // Walkthrough finding 96: Enviar comentarios ends with its text field; the
  // system keeps the caret in view, not the counter row under the field.
  describe("revealing the end of the form with the keyboard", () => {
    const renderRevealing = async () => {
      const scrollToEnd = jest
        .spyOn(ScrollView.prototype as { scrollToEnd: () => void }, "scrollToEnd")
        .mockImplementation(() => undefined);
      await render(
        <FormScrollView revealEndWithKeyboard testID="form">
          <Text>Comentario</Text>
        </FormScrollView>,
      );
      return scrollToEnd;
    };

    const keyboardShown = () =>
      act(async () => {
        DeviceEventEmitter.emit("keyboardDidShow", {
          endCoordinates: { height: 300, screenX: 0, screenY: 500, width: 400 },
        });
      });

    it("scrolls to the end once the keyboard is up", async () => {
      const scrollToEnd = await renderRevealing();

      await keyboardShown();

      expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
    });
  });
});
