import { Alert } from "react-native";

export function confirmLogout(logout: () => Promise<void>): void {
  Alert.alert(
    "¿Cerrar sesión?",
    "Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña.",
    [
      { style: "cancel", text: "Cancelar" },
      { onPress: () => void logout(), style: "destructive", text: "Cerrar sesión" },
    ],
  );
}
