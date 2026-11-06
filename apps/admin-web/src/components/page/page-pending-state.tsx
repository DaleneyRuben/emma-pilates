import { BrandedLoading } from "./branded-loading";

/**
 * Design follow-up 107: only the logo, centred in the shell's main area,
 * while a page's chunk is slow to arrive (WEB-035). The router already
 * waits 400 ms before drawing it, so it adds no wait of its own. At the
 * root (Login's session probe after a logout) it falls back to the
 * minimum band.
 */
export function PagePendingState() {
  return <BrandedLoading label="Cargando la página" delayed={false} />;
}
