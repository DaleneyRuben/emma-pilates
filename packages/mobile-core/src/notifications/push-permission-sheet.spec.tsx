import { cleanup, fireEvent, render } from "@testing-library/react-native";

import { PushPermissionSheet } from "./push-permission-sheet";

const hidden = { includeHiddenElements: true };

// Walkthrough n.º 16: each app gives the sheet its own title and text; the
// staff copy stays the default until the staff walkthrough proposes one.
describe("PushPermissionSheet", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("keeps «¿Te avisamos?» as the default title", async () => {
    const screen = await render(
      <PushPermissionSheet onAccept={jest.fn()} onDecline={jest.fn()} reason="Texto" visible />,
    );

    expect(screen.getByText("¿Te avisamos?")).toBeOnTheScreen();
    expect(screen.getByText("Texto")).toBeOnTheScreen();
  });

  it("takes the app's own title and draws the v2 bell disc", async () => {
    const screen = await render(
      <PushPermissionSheet
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        reason="Te avisamos antes de cada clase."
        title="No te pierdas ninguna clase"
        visible
      />,
    );

    expect(screen.getByRole("header", { name: "No te pierdas ninguna clase" })).toHaveStyle({
      fontSize: 24,
      textAlign: "center",
    });
    expect(screen.getByText("Te avisamos antes de cada clase.")).toHaveStyle({
      color: "#6F6662",
      textAlign: "center",
    });
    expect(screen.getByTestId("push-permission-sheet")).toHaveStyle({
      backgroundColor: "#FAF7F2",
      borderTopLeftRadius: 24,
    });
    expect(screen.getByTestId("push-permission-disc")).toHaveStyle({
      backgroundColor: "#F2E4E1",
      height: 72,
    });
    expect(screen.getByTestId("glyph-bell", hidden)).toHaveProp("stroke", "#93615D");
  });

  it("answers through stable test ids for the Maestro subflows", async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const screen = await render(
      <PushPermissionSheet onAccept={onAccept} onDecline={onDecline} reason="Texto" visible />,
    );

    await fireEvent.press(screen.getByTestId("push-permission-decline"));
    await fireEvent.press(screen.getByTestId("push-permission-accept"));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
