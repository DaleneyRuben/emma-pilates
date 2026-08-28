import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { fontAssets } from './src/ui/fonts';
import { Heading } from './src/ui/heading';
import { PrimaryButton } from './src/ui/primary-button';
import { Screen } from './src/ui/screen';

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Screen testID="app-screen">
      <Heading accessibilityLabel="Emma Pilates Studio">
        Emma Pilates Studio
      </Heading>
      <PrimaryButton label="Continuar" />
      <StatusBar style="auto" />
    </Screen>
  );
}
