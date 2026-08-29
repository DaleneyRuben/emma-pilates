import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { fontAssets } from "./src/ui/fonts";
import { MobileNavigation } from "./src/navigation";
import { MobileQueryProvider } from "./src/query/provider";

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <MobileQueryProvider>
        <MobileNavigation />
      </MobileQueryProvider>
      <StatusBar style="auto" />
    </>
  );
}
