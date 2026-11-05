import {
  bolivia,
  frequentPhoneCountries,
  parseStoredPhone,
  phoneCountries,
  phoneCountryByIso,
  phoneProblem,
  phoneRequiredMessage,
  phoneWithFlag,
  searchPhoneCountries,
  storedPhone,
} from "./phone-number";

const peru = phoneCountryByIso("PE");
const argentina = phoneCountryByIso("AR");

describe("phone numbers with a country code (FIX-037)", () => {
  it("lists the countries A–Z by name with Bolivia among them", () => {
    const names = phoneCountries.map((country) => country.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
    expect(bolivia).toMatchObject({ dial: "591", flag: "🇧🇴", iso: "BO", name: "Bolivia" });
    expect(frequentPhoneCountries.map((country) => country.name)).toEqual([
      "Argentina",
      "Brasil",
      "Chile",
      "Perú",
      "Paraguay",
    ]);
  });

  it("keeps FIX-036's Bolivian rule: 8 digits starting with 6 or 7", () => {
    expect(phoneProblem(bolivia, "71234567")).toBeNull();
    expect(phoneProblem(bolivia, "6123 4567")).toBeNull();
    expect(phoneProblem(bolivia, "+591 71234567")).toBeNull();
    expect(phoneProblem(bolivia, "5123456")).toBe(
      "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
    );
    expect(phoneProblem(bolivia, "812345678")).toBe(
      "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.",
    );
  });

  it("checks other countries with their own length and first digit", () => {
    expect(phoneProblem(peru, "912345678")).toBeNull();
    expect(phoneProblem(peru, "81234")).toBe("Un celular de Perú tiene 9 dígitos y empieza con 9.");
    expect(phoneProblem(argentina, "91123456789")).toBeNull();
    expect(phoneProblem(phoneCountryByIso("US"), "3055550123")).toBeNull();
    expect(phoneProblem(phoneCountryByIso("US"), "305555")).toBe(
      "Un celular de Estados Unidos tiene 10 dígitos.",
    );
  });

  it("asks for the number when it is blank", () => {
    expect(phoneProblem(bolivia, "  ")).toBe(phoneRequiredMessage);
    expect(phoneRequiredMessage).toBe(
      "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.",
    );
  });

  it("stores any country as «+<code> <digits>», dropping a typed code", () => {
    expect(storedPhone(bolivia, "7123-4567")).toBe("+591 71234567");
    expect(storedPhone(bolivia, "+591 71234567")).toBe("+591 71234567");
    expect(storedPhone(peru, "912 345 678")).toBe("+51 912345678");
    expect(storedPhone(peru, "+51 912345678")).toBe("+51 912345678");
  });

  it("reads a stored number back into its country and digits", () => {
    expect(parseStoredPhone("+591 70712345")).toEqual({ country: bolivia, digits: "70712345" });
    expect(parseStoredPhone("+54 91123456789")).toEqual({
      country: argentina,
      digits: "91123456789",
    });
    // A number saved before FIX-037 with spaces still reads into its country.
    expect(parseStoredPhone("+54 9 11 5555 0000")).toEqual({
      country: argentina,
      digits: "91155550000",
    });
    expect(parseStoredPhone(null)).toEqual({ country: bolivia, digits: "" });
    expect(parseStoredPhone("700 12345")).toEqual({ country: bolivia, digits: "70012345" });
  });

  it("shows a stored number with its flag and leaves other text alone", () => {
    expect(phoneWithFlag("+591 70712345")).toBe("🇧🇴 +591 70712345");
    expect(phoneWithFlag("+51 912345678")).toBe("🇵🇪 +51 912345678");
    expect(phoneWithFlag("+1 3055550123")).toBe("🇺🇸 +1 3055550123");
    expect(phoneWithFlag("llamar a recepción")).toBe("llamar a recepción");
  });

  it("finds countries by name, without accents, or by code", () => {
    expect(searchPhoneCountries("peru").map((country) => country.iso)).toEqual(["PE"]);
    expect(searchPhoneCountries("+595").map((country) => country.iso)).toEqual(["PY"]);
    expect(searchPhoneCountries("").length).toBe(phoneCountries.length);
  });
});
