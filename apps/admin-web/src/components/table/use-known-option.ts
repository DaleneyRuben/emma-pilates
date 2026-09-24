import { useEffect, useRef } from "react";

/**
 * A filter the address remembers can name an option the page no longer
 * offers: AW31's Supply or AW25's Nutritionist after the Branch selector
 * changes, or a pasted address from another Branch. Once the options are
 * known and the value is not among them, the filter is forgotten, so the
 * list never stays narrowed by a choice the select cannot show.
 */
export function useKnownOption(
  value: string | undefined,
  options: readonly { id: string }[] | undefined,
  forget: () => void,
): void {
  const latest = useRef(forget);
  useEffect(() => {
    latest.current = forget;
  }, [forget]);

  useEffect(() => {
    if (
      value !== undefined &&
      options !== undefined &&
      !options.some((option) => option.id === value)
    ) {
      latest.current();
    }
  }, [value, options]);
}
