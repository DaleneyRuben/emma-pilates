import { fireEvent, render } from "@testing-library/react-native";

import { QueryFailure } from "./query-failure";
import { textVariants } from "./type-scale";

// Rosa Emma E-A13: a load failure is a white card with the alert on a disc,
// the sentence in cuerpo, centred (follow-up 285: never Lora), and «Reintentar».
describe("QueryFailure", () => {
  it("says the failure in a white card and retries", async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <QueryFailure label="No pudimos cargar tu agenda." onRetry={onRetry} />,
    );

    expect(screen.getByTestId("query-failure")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    expect(screen.getByRole("alert")).toHaveStyle({ ...textVariants.cuerpo, textAlign: "center" });
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
