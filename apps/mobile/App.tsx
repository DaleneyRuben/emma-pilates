import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { StyleSheet, View } from 'react-native';

import { fontAssets } from './src/ui/fonts';
import { Heading } from './src/ui/heading';
import { PrimaryButton } from './src/ui/primary-button';

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Heading accessibilityLabel="Emma Pilates Studio">
        Emma Pilates Studio
      </Heading>
      <PrimaryButton label="Continuar" />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
