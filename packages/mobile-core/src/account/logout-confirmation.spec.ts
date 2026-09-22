import { Alert } from "react-native";

import { confirmLogout } from "./logout-confirmation";

type AlertButton = { text?: string; style?: string; onPress?: () => void };

describe("confirmLogout", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

  afterEach(() => {
    alert.mockClear();
  });

  it("asks before logging out and only logs out on confirmation", () => {
    const logout = jest.fn().mockResolvedValue(undefined);

    confirmLogout(logout);

    expect(alert).toHaveBeenCalledWith(
      "¿Cerrar sesión?",
      "Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña.",
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    const cancel = buttons.find((button) => button.text === "Cancelar");
    const confirm = buttons.find((button) => button.text === "Cerrar sesión");

    expect(cancel?.style).toBe("cancel");
    expect(confirm?.style).toBe("destructive");
    cancel?.onPress?.();
    expect(logout).not.toHaveBeenCalled();
    confirm?.onPress?.();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
