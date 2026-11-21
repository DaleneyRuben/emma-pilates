import { Lora_500Medium } from "@expo-google-fonts/lora";
import {
  WorkSans_400Regular,
  WorkSans_400Regular_Italic,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from "@expo-google-fonts/work-sans";

import { typeFaces } from "./type-scale";

/** The faces the type scale draws with (follow-up 285), loaded at launch. */
export const fontAssets = {
  [typeFaces.serif]: Lora_500Medium,
  [typeFaces.regular]: WorkSans_400Regular,
  [typeFaces.italic]: WorkSans_400Regular_Italic,
  [typeFaces.semibold]: WorkSans_600SemiBold,
  [typeFaces.bold]: WorkSans_700Bold,
};
