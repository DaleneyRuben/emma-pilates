import { render } from "@testing-library/react-native";

import { InvitationMenu } from "../assistant/invitation-menu";
import { InvoiceSwitch } from "../assistant/invoice-switch";
import { StateCard } from "../assistant/state-card";
import { ProfileRow } from "../profile/profile-row";
import { PersonRow } from "./person-row";

const rubor = "#E7CCBF";
const noop = () => undefined;

type Node = { children?: (Node | string)[] | null; props?: { style?: unknown } } | string | null;

// Every background drawn under the node but the 1 pt Rubor dividers, to say
// no icon sits on a tinted disc.
function backgrounds(node: Node | Node[]): string[] {
  if (node === null || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(backgrounds);
  const style = Object.assign({}, ...[node.props?.style].flat(Infinity).filter(Boolean)) as {
    backgroundColor?: string;
    height?: number;
  };
  const own =
    style.backgroundColor === undefined || style.height === 1 ? [] : [style.backgroundColor];
  return [...own, ...(node.children ?? []).flatMap((child) => backgrounds(child))];
}

// FIX-089: no tinted disc behind an icon; a person without a photo is her
// initials in bold Crema on a Palo de rosa circle (ListaC).
describe("Staff rows without discs", () => {
  it("draws S10's «Pide factura» switch without a Rubor fill", async () => {
    const screen = await render(
      <InvoiceSwitch
        onChange={noop}
        value={{ name: "", taxId: "", wantsInvoice: false } as never}
      />,
    );
    expect(backgrounds(screen.toJSON() as Node)).not.toContain(rubor);
  });

  it("draws S06's state card with a plain icon", async () => {
    const screen = await render(<StateCard icon="calendar" note="Sin plan" title="Sin plan" />);
    expect(backgrounds(screen.toJSON() as Node)).not.toContain(rubor);
  });

  it("draws the invitation menu rows with plain icons", async () => {
    const screen = await render(
      <InvitationMenu
        cancellable
        firstName="Rocío"
        onCancel={noop}
        onChangeEmail={noop}
        onClose={noop}
        visible
      />,
    );
    expect(backgrounds(screen.toJSON() as Node)).not.toContain(rubor);
  });

  it("draws a Perfil row and «Cerrar sesión» with plain icons", async () => {
    const screen = await render(
      <>
        <ProfileRow icon="person" label="Mis datos" onPress={noop} />
        <ProfileRow icon="logout" label="Cerrar sesión" onPress={noop} tone="error" />
      </>,
    );
    expect(backgrounds(screen.toJSON() as Node)).not.toContain(rubor);
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#93615D" });
  });

  it("draws a person's initials in bold Crema on Palo de rosa", async () => {
    const screen = await render(<PersonRow name="Carla Mendoza" />);

    expect(screen.getByText("CM")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "WorkSans_600SemiBold",
      fontWeight: "700",
    });
    expect(screen.getByText("CM").parent).toHaveStyle({ backgroundColor: "#B78380" });
  });
});
