import { render } from "@testing-library/react-native";

import { ClientBanner } from "./client-banner";

describe("ClientBanner", () => {
  it("names the Client in the on-tint tone (follow-up 70)", async () => {
    const screen = await render(
      <ClientBanner action="Reservando para" clientName="Lucía Fernández" />,
    );

    expect(screen.getByText("Reservando para: Lucía Fernández")).toHaveStyle({
      color: "#7A4F4B",
    });
  });
});
