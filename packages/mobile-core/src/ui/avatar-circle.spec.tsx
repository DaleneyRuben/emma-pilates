import { render } from "@testing-library/react-native";

import { AvatarCircle } from "./avatar-circle";

// E-F18, E-F19: a sender's disc carries her two initials, as on the admin web.
describe("AvatarCircle", () => {
  it("shows the first and last name's initials", async () => {
    const screen = await render(<AvatarCircle name="Lucía Fernández" size={36} />);

    expect(screen.getByText("LF")).toBeOnTheScreen();
  });

  it("shows one initial for a single name", async () => {
    const screen = await render(<AvatarCircle name=" ana " size={36} />);

    expect(screen.getByText("A")).toBeOnTheScreen();
  });
});
