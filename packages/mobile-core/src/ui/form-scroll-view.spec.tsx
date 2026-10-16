import { act, fireEvent, render } from "@testing-library/react-native";
import { DeviceEventEmitter, Platform, Text } from "react-native";

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
});
