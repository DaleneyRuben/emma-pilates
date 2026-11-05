// FIX-037 red stub: the field lands in the next commit.
import { Text } from "react-native";

import type { PhoneCountry } from "../account/phone-number";

export type PhoneValue = { country: PhoneCountry; digits: string };

export function PhoneField({
  label = "Celular",
}: {
  error?: string;
  helper?: string;
  label?: string;
  onChange: (value: PhoneValue) => void;
  value: PhoneValue;
}) {
  return <Text>{label}</Text>;
}
