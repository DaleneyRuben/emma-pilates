import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { fontAssets } from "./src/ui/fonts";
import { MobileNavigation } from "./src/navigation";

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <MobileNavigation />
      <StatusBar style="auto" />
    </>
  );
}
