/**
 * WEB-037: `react-remove-scroll` (inside Radix's modal dialogs) renders
 * `react-remove-scroll-bar`, which injects a <style> element with computed
 * paddings; the Content-Security-Policy refuses it (WEB-030). The Vite
 * config and the Jest module map resolve that package to this file, which
 * draws nothing: `body-scroll-lock.ts` locks the page instead. The wheel and
 * touch handling of `react-remove-scroll` itself is untouched. The constants
 * are the package's own, for anything that still reads them.
 */
export const zeroRightClassName = "right-scroll-bar-position";
export const fullWidthClassName = "width-before-scroll-bar";
export const noScrollbarsClassName = "with-scroll-bars-hidden";
export const removedBarSizeVariable = "--removed-body-scroll-bar-size";

export function RemoveScrollBar(): null {
  return null;
}
