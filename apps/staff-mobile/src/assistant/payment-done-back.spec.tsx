import { act, render } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import { PaymentDone } from "./payment-done";

type BackListener = () => boolean | null | undefined;

// Seen on the emulator (MOB-074): back from «¡Pago registrado!» reopened
// «Elige un plan» for a Client whose plan was already active. The result's
// only way on is «Volver a Clientes», so the Android back button takes it too.
describe("PaymentDone and the Android back button", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(["cash", "transfer"] as const)("returns to Clientes after a %s payment", async (kind) => {
    const listeners: BackListener[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
    });
    const onBack = jest.fn();
    await render(
      <PaymentDone
        amount="Bs 476"
        classes="8 clases"
        firstName="Mariana"
        kind={kind}
        onBack={onBack}
        scheduled={false}
      />,
    );

    let handled = false;
    await act(async () => {
      handled = [...listeners].reverse().some((listener) => listener() === true);
    });

    expect(handled).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
