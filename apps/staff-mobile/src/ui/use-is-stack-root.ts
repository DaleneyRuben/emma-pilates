import { useNavigationState } from "@react-navigation/native";

/**
 * True on the first screen of its stack: a tab root, which draws no back
 * button. The same screen pushed on another tab's stack (Cerrar caja from
 * Pagos, Cancelar una clase from Horario) gets one.
 */
export function useIsStackRoot(): boolean {
  return useNavigationState((state) => state?.index === 0);
}
