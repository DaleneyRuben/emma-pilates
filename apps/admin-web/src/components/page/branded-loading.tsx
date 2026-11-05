import { useId, useLayoutEffect, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";

/*
 * Follow-ups 94 and 107 (WEB-045): while an area loads, only the studio's
 * logo, breathing, centred in the area it replaces. `flex-1` grows it into
 * the space its flex column has left, and `.carga-area` lets every flex
 * column on the way up grow too (`src/carga.css`): the shell's main area
 * for a page, the rest of a page under its header, a side panel's body.
 * The minimum band keeps it centred where no parent grows. The breath and its
 * Reduce Motion stillness come from `.carga-logo` in `src/carga.css`.
 *
 * Only one logo is on screen at a time: when two areas of a page load at
 * once (Informes › Dinero reads the accrued revenue and the report), the
 * first one mounted shows it and the others draw nothing until it is gone.
 */
const shown: string[] = [];
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const firstShown = () => shown[0];

function useIsFirstLoader(id: string) {
  useLayoutEffect(() => {
    shown.push(id);
    notify();
    return () => {
      shown.splice(shown.indexOf(id), 1);
      notify();
    };
  }, [id]);
  const first = useSyncExternalStore(subscribe, firstShown, firstShown);
  return first === undefined || first === id;
}

export function BrandedLoading({
  label,
  delayed,
}: {
  /** The Spanish status, e.g. «Cargando el horario…»; the image is not read. */
  label: string;
  /** Follow-up 94's 400 ms of nothing; the router's page switch waits itself. */
  delayed: boolean;
}) {
  const first = useIsFirstLoader(useId());
  if (!first) return null;
  return (
    <div
      role="status"
      aria-label={label}
      className="carga-area flex min-h-[240px] flex-1 items-center justify-center"
    >
      <img
        className={cn("carga-logo", delayed && "carga-logo-demora")}
        src="/emma-logo.png"
        alt=""
        width={800}
        height={333}
      />
    </div>
  );
}
