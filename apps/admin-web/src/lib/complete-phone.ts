import { parseStoredPhone, phoneCountries } from "./phone-number";

const withCode = /^\+(\d{1,3})[\s-]+(\d[\d\s-]*)$/;

/**
 * Walkthrough finding 74 (FIX-063): whether a stored phone is a usable mobile.
 * A Client registered before the phone was required may have none, or digits
 * that fit no mobile (`7000004`). Numbers saved before FIX-037 with spaces or
 * dashes, or a Bolivian mobile without +591, still count, as
 * `parseStoredPhone` reads them. A code outside the web's list needs 6 to 14
 * digits, as the backend's `isStorableMobile`. The Staff app decides it with
 * `packages/mobile-core/src/account/complete-phone.ts`: change both together.
 */
export const isCompletePhone = (stored: string | null): boolean => {
  const trimmed = stored?.trim() ?? "";
  if (trimmed === "") return false;
  const [, dial, national] = withCode.exec(trimmed) ?? [];
  if (
    dial !== undefined &&
    national !== undefined &&
    !phoneCountries.some((country) => country.dial === dial)
  ) {
    const digits = national.replace(/\D/g, "");
    return digits.length >= 6 && digits.length <= 14;
  }
  const { country, digits } = parseStoredPhone(trimmed);
  return (
    country.lengths.includes(digits.length) &&
    (country.starts.length === 0 ||
      country.starts.some((start) => digits.startsWith(start)))
  );
};
