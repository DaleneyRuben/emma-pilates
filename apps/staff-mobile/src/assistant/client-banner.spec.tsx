import { render } from "@testing-library/react-native";

import { ClientBanner } from "./client-banner";

describe("ClientBanner", () => {
  // v2 S07: a Lino strip with her initials and her name in bold.
  it("names the Client beside her initials on Lino", async () => {
    const screen = await render(
      <ClientBanner
        action="Reservando para"
        clientName="Lucía Fernández"
        detail="8 clases en su plan"
      />,
    );

    expect(screen.getByText("LF")).toBeOnTheScreen();
    expect(screen.getByText("Reservando para Lucía Fernández · 8 clases en su plan")).toHaveStyle({
      color: "#6F6662",
    });
    expect(screen.getByText("Lucía Fernández")).toHaveStyle({ color: "#4A4A4A" });
    expect(screen.getByTestId("client-banner")).toHaveStyle({ backgroundColor: "#F5EFE9" });
  });
});
