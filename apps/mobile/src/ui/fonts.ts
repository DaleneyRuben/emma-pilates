import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
} from "@expo-google-fonts/lora";
import {
  WorkSans_300Light,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from "@expo-google-fonts/work-sans";

export const fontFamilies = {
  display: "Lora_400Regular",
  heading: "Lora_500Medium",
  headingStrong: "Lora_600SemiBold",
  bodyLight: "WorkSans_300Light",
  body: "WorkSans_400Regular",
  bodyMedium: "WorkSans_500Medium",
  bodyStrong: "WorkSans_600SemiBold",
} as const;

export const fontAssets = {
  [fontFamilies.display]: Lora_400Regular,
  [fontFamilies.heading]: Lora_500Medium,
  [fontFamilies.headingStrong]: Lora_600SemiBold,
  [fontFamilies.bodyLight]: WorkSans_300Light,
  [fontFamilies.body]: WorkSans_400Regular,
  [fontFamilies.bodyMedium]: WorkSans_500Medium,
  [fontFamilies.bodyStrong]: WorkSans_600SemiBold,
};
