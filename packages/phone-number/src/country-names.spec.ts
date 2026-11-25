import { getCountries } from "libphonenumber-js/max";

import { countryNames } from "./generated/country-names";

// After a libphonenumber-js upgrade, rerun `generate:countries` when this fails.
it("names every country libphonenumber-js knows", () => {
  expect(countryNames.map(([iso]) => iso).sort()).toEqual([...getCountries()].sort());
});
