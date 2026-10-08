import { EmptyState } from "./empty-state";
import { PrimaryButton } from "./primary-button";
import { Screen } from "./screen";

/** Follow-up 89: the plain empty state with an action, drawn where a screen failed. */
export const recoveryCopy = {
  action: "Reintentar",
  note: "No pudimos mostrar esta pantalla. Inténtalo de nuevo; si vuelve a pasar, cierra la app y ábrela otra vez.",
  title: "Algo salió mal",
} as const;

export function RecoveryScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen>
      <EmptyState
        action={<PrimaryButton label={recoveryCopy.action} onPress={onRetry} />}
        message={recoveryCopy.note}
        title={recoveryCopy.title}
        variant="plain"
      />
    </Screen>
  );
}
