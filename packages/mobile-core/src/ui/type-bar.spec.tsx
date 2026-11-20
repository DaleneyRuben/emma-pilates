import { render } from "@testing-library/react-native";

import { classTypeColor, TypeBar } from "./type-bar";

// Rosa Emma: class-type bars are Reformer 600, Mat 300 and Cadillac 500.
describe("classTypeColor", () => {
  it("colours each class type by its name", () => {
    expect(classTypeColor("Reformer Pilates")).toBe("#93615D");
    expect(classTypeColor("Mat Pilates")).toBe("#DAB9AB");
    expect(classTypeColor("Cadillac")).toBe("#B78380");
    expect(classTypeColor("Barre")).toBe("#CDA697");
  });
});

describe("TypeBar", () => {
  it("draws a 5 pt bar in the type's colour", async () => {
    const screen = await render(<TypeBar name="Mat Pilates" />);

    expect(screen.getByTestId("type-bar")).toHaveStyle({
      backgroundColor: "#DAB9AB",
      borderRadius: 3,
      width: 5,
    });
  });
});
