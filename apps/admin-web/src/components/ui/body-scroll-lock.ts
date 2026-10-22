import { useLayoutEffect } from "react";

/**
 * WEB-037: while a dialog, sheet, or side panel is open the page behind it
 * must not scroll. Radix locks it through `react-remove-scroll`, which
 * injects a <style> element the Content-Security-Policy refuses
 * (`style-src 'self'`, WEB-030), so that injection is stubbed out
 * (`remove-scroll-bar-stub.ts`) and the overlays toggle this body class
 * instead, defined in `index.css`. The hidden scrollbar's width goes into a
 * custom property through the CSSOM, which the policy allows, so nothing
 * shifts. Overlays stack (a confirmation over a side panel, the enlarged
 * receipt over the payment panel): the class leaves with the last one.
 */
export const scrollLockClass = "sin-desplazamiento";
export const scrollbarGapVariable = "--ancho-barra";

let openOverlays = 0;

function lock(): void {
  openOverlays += 1;
  if (openOverlays > 1) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.setProperty(scrollbarGapVariable, `${gap}px`);
  document.body.classList.add(scrollLockClass);
}

function release(): void {
  openOverlays -= 1;
  if (openOverlays > 0) return;
  document.body.classList.remove(scrollLockClass);
  document.body.style.removeProperty(scrollbarGapVariable);
}

export function useBodyScrollLock(): void {
  useLayoutEffect(() => {
    lock();
    return release;
  }, []);
}

/** Rendered inside an overlay's content, so it exists only while open. */
export function BodyScrollLock(): null {
  useBodyScrollLock();
  return null;
}
