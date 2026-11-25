import {
  bolivia,
  frequentPhoneCountries,
  isCompletePhone,
  parseStoredPhone,
  phoneCountries,
  phoneCountryByIso,
  phonePlaceholder,
  phoneProblem,
  phoneRequiredMessage,
  phoneWithFlag,
  searchPhoneCountries,
  storedPhone,
  theirPhoneRequiredMessage,
} from "./index";

const peru = phoneCountryByIso("PE");
const argentina = phoneCountryByIso("AR");
const spain = phoneCountryByIso("ES");
const unitedStates = phoneCountryByIso("US");

describe("the country list", () => {
  it("offers every country libphonenumber knows, A–Z by Spanish name", () => {
    const names = phoneCountries.map((country) => country.name);

    expect(phoneCountries.length).toBeGreaterThan(240);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
    expect(bolivia).toEqual({ dial: "591", flag: "🇧🇴", iso: "BO", name: "Bolivia" });
    expect(unitedStates).toEqual({ dial: "1", flag: "🇺🇸", iso: "US", name: "Estados Unidos" });
  });

  it("keeps the frequent countries and their order", () => {
    expect(frequentPhoneCountries.map((country) => country.name)).toEqual([
      "Argentina",
      "Brasil",
      "Chile",
      "Perú",
      "Paraguay",
    ]);
  });

  it("finds countries by name, without accents, or by code", () => {
    expect(searchPhoneCountries("peru").map((country) => country.iso)).toEqual(["PE"]);
    expect(searchPhoneCountries("+595").map((country) => country.iso)).toEqual(["PY"]);
    expect(searchPhoneCountries("").length).toBe(phoneCountries.length);
  });

  it("refuses an unknown country", () => {
    expect(() => phoneCountryByIso("ZZ")).toThrow("Unknown phone country ZZ");
  });
});

describe("phoneProblem", () => {
  const notMobile = (name: string) => `Ese número no parece un celular de ${name}.`;

  it.each(["57007684", "60012345", "71234567", "6123 4567", "7123-4567", "+591 57007684"])(
    "accepts the Bolivian mobile %p",
    (typed) => {
      expect(phoneProblem(bolivia, typed)).toBeNull();
    },
  );

  it.each([
    ["22123456", "a La Paz fixed line"],
    ["2 2771234", "a fixed line with spaces"],
    ["5123456", "seven digits"],
    ["812345678", "nine digits"],
    ["+51 912345678", "a Peruvian mobile under Bolivia"],
  ])("refuses %p (%s) for Bolivia", (typed) => {
    expect(phoneProblem(bolivia, typed)).toBe(notMobile("Bolivia"));
  });

  it("checks other countries with libphonenumber's own metadata", () => {
    expect(phoneProblem(argentina, "9 11 1234 5678")).toBeNull();
    expect(phoneProblem(argentina, "11 15 1234 5678")).toBeNull();
    expect(phoneProblem(peru, "912 345 678")).toBeNull();
    expect(phoneProblem(peru, "81234")).toBe(notMobile("Perú"));
    expect(phoneProblem(unitedStates, "(201) 555-0123")).toBeNull();
    expect(phoneProblem(unitedStates, "305555")).toBe(notMobile("Estados Unidos"));
    expect(phoneProblem(spain, "612 34 56 78")).toBeNull();
    expect(phoneProblem(spain, "912 34 56 78")).toBe(notMobile("España"));
  });

  it("asks for the number when it is blank, in the first or third person", () => {
    expect(phoneProblem(bolivia, "  ")).toBe(phoneRequiredMessage);
    expect(phoneRequiredMessage).toBe(
      "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.",
    );
    expect(phoneProblem(bolivia, "", "theirs")).toBe(theirPhoneRequiredMessage);
    expect(theirPhoneRequiredMessage).toBe(
      "Escribe su celular. Lo necesitamos para escribirle por WhatsApp.",
    );
    expect(phoneProblem(bolivia, "7000004", "theirs")).toBe(notMobile("Bolivia"));
  });
});

describe("storedPhone", () => {
  it("stores any country as «+<code> <national digits>», dropping a typed code", () => {
    expect(storedPhone(bolivia, "5700-7684")).toBe("+591 57007684");
    expect(storedPhone(bolivia, "+591 71234567")).toBe("+591 71234567");
    expect(storedPhone(bolivia, "59171234567")).toBe("+591 71234567");
    expect(storedPhone(peru, "912 345 678")).toBe("+51 912345678");
    expect(storedPhone(argentina, "+54 9 11 1234 5678")).toBe("+54 91112345678");
    expect(storedPhone(argentina, "11 15 1234 5678")).toBe("+54 91112345678");
    expect(storedPhone(unitedStates, "(201) 555-0123")).toBe("+1 2015550123");
    expect(storedPhone(spain, "612 34 56 78")).toBe("+34 612345678");
  });
});

describe("parseStoredPhone", () => {
  it("reads a stored number back into its country and digits", () => {
    expect(parseStoredPhone("+591 57007684")).toEqual({ country: bolivia, digits: "57007684" });
    expect(parseStoredPhone("+54 91123456789")).toEqual({
      country: argentina,
      digits: "91123456789",
    });
    expect(parseStoredPhone("+1 2015550123").country).toBe(unitedStates);
    expect(parseStoredPhone("+1 4165550123").country).toBe(phoneCountryByIso("CA"));
    // An unknown +1 number opens as the code's main country.
    expect(parseStoredPhone("+1 123").country).toBe(unitedStates);
  });

  it("reads numbers saved before FIX-037", () => {
    expect(parseStoredPhone("+54 9 11 5555 0000")).toEqual({
      country: argentina,
      digits: "91155550000",
    });
    expect(parseStoredPhone("700 12345")).toEqual({ country: bolivia, digits: "70012345" });
    expect(parseStoredPhone(null)).toEqual({ country: bolivia, digits: "" });
  });
});

describe("phoneWithFlag", () => {
  it("shows a stored number with its flag and leaves other text alone", () => {
    expect(phoneWithFlag("+591 57007684")).toBe("🇧🇴 +591 57007684");
    expect(phoneWithFlag("+51 912345678")).toBe("🇵🇪 +51 912345678");
    expect(phoneWithFlag("+1 3055550123")).toBe("🇺🇸 +1 3055550123");
    expect(phoneWithFlag("+999 1234567")).toBe("+999 1234567");
    expect(phoneWithFlag("llamar a recepción")).toBe("llamar a recepción");
  });
});

describe("phonePlaceholder", () => {
  it("names the digits of the country's example mobile", () => {
    expect(phonePlaceholder(bolivia)).toBe("8 dígitos");
    expect(phonePlaceholder(peru)).toBe("9 dígitos");
    expect(phonePlaceholder(unitedStates)).toBe("10 dígitos");
  });
});

describe("isCompletePhone", () => {
  // The shapes the database holds today (FIX-036, FIX-037 and older rows).
  it.each([
    "+591 70011001",
    "+591 61234567",
    "+591 57007684",
    "+51 912345678",
    "+54 91123456789",
    "+1 3055550123",
    "+44 7911123456",
    "+34 612345678",
    "+591 7001-1001",
    "+54 9 11 1234 5678",
    "70011001",
  ])("accepts %p", (stored) => {
    expect(isCompletePhone(stored)).toBe(true);
  });

  it.each<[string | null | undefined, string]>([
    [null, "none"],
    [undefined, "none from an older API"],
    ["", "an empty one"],
    ["7000004", "digits without a country code"],
    ["+591 7000004", "seven Bolivian digits"],
    ["+591 22123456", "a Bolivian fixed line"],
    ["+51 12345", "a short Peruvian number"],
    ["+591 59170011001", "the country code typed twice"],
    ["+44 1", "one digit after a code"],
    ["+999 1234567", "an unknown code"],
  ])("refuses %p (%s)", (stored) => {
    expect(isCompletePhone(stored)).toBe(false);
  });
});
