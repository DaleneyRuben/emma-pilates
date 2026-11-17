import { phoneCountries, phoneProblem } from "./phone-number";

/**
 * Walkthrough finding 74 (FIX-063): whether a stored phone is a mobile in the
 * shape every form saves, «+<code> <digits>». A Client registered before the
 * phone was required may have none, or digits without a country code. A code
 * outside the web's list is trusted as typed; a listed country must fit its
 * mobile rule (`phoneProblem`).
 */
export const isCompletePhone = (stored: string | null): boolean => {
  const [, dial, digits] =
    /^\+(\d{1,3}) (\d+)$/.exec(stored?.trim() ?? "") ?? [];
  if (dial === undefined || digits === undefined) return false;
  const countries = phoneCountries.filter((country) => country.dial === dial);
  return (
    countries.length === 0 ||
    countries.some((country) => phoneProblem(country, digits) === null)
  );
};
