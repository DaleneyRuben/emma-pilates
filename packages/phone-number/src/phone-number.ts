// A mobile number with its country code, checked against Google's
// libphonenumber metadata. Every country is stored as «+<code> <national
// digits>» (FIX-037), e.g. «+591 71234567». The backend reads the same
// metadata in `apps/backend/src/phone/contact-phone.ts`.
import { bolivia, findPhoneCountry, type PhoneCountry } from "./countries";
import { countryOfNumber, exampleMobileLength, storedMobile, typedMobile } from "./libphonenumber";

export const phoneRequiredMessage =
  "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.";

/** Verification n.º 41: the team types someone else's number. */
export const theirPhoneRequiredMessage =
  "Escribe su celular. Lo necesitamos para escribirle por WhatsApp.";

/**
 * Null when the typed number is a mobile of the country, else the line to
 * show. «theirs» when the team types someone else's number.
 */
export const phoneProblem = (
  target: PhoneCountry,
  typed: string,
  whose: "own" | "theirs" = "own",
): string | null => {
  if (typed.trim() === "") {
    return whose === "own" ? phoneRequiredMessage : theirPhoneRequiredMessage;
  }
  return typedMobile(target.iso, typed) === null
    ? `Ese número no parece un celular de ${target.name}.`
    : null;
};

/** «+<code> <national digits>»; send it only once `phoneProblem` is null. */
export const storedPhone = (target: PhoneCountry, typed: string): string => {
  const mobile = typedMobile(target.iso, typed);
  return mobile === null
    ? `+${target.dial} ${typed.replace(/\D/g, "")}`
    : `+${mobile.dial} ${mobile.national}`;
};

// «+<code> <digits>», or a number saved before FIX-037 with spaces or dashes.
const withCode = /^\+(\d{1,3})[\s-]+(\d[\d\s-]*)$/;

const countryWithCode = (stored: string) => {
  const [, dial, typedDigits] = withCode.exec(stored) ?? [];
  if (dial === undefined || typedDigits === undefined) return undefined;
  const digits = typedDigits.replace(/\D/g, "");
  const country = findPhoneCountry(countryOfNumber(dial, digits));
  return country === undefined ? undefined : { country, digits };
};

/** A stored number back into the field: its country and digits. */
export const parseStoredPhone = (
  stored: string | null | undefined,
): { country: PhoneCountry; digits: string } => {
  const trimmed = stored?.trim() ?? "";
  return countryWithCode(trimmed) ?? { country: bolivia, digits: trimmed.replace(/\D/g, "") };
};

/** «🇧🇴 +591 70712345» in lists; anything else is shown as stored. */
export const phoneWithFlag = (stored: string): string => {
  const trimmed = stored.trim();
  const found = /^\+\d{1,3} \d+$/.test(trimmed) ? countryWithCode(trimmed) : undefined;
  return found === undefined ? stored : `${found.country.flag} ${trimmed}`;
};

/**
 * Walkthrough findings 74 and 95: whether a stored phone is a usable mobile.
 * A Client registered before the phone was required may have none, or digits
 * that are no mobile (`7000004`). Numbers saved before FIX-037 with spaces or
 * dashes, or a Bolivian mobile without +591, still count.
 */
export const isCompletePhone = (stored: string | null | undefined): boolean => {
  if ((stored?.trim() ?? "") === "") return false;
  const { country, digits } = parseStoredPhone(stored);
  return storedMobile(country.dial, digits) !== null;
};

/** The field's placeholder: how many digits the country's example mobile has. */
export const phonePlaceholder = (target: PhoneCountry): string => {
  const length = exampleMobileLength(target.iso);
  return length === undefined ? "Número" : `${length} dígitos`;
};
