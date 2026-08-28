import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './src/ui/primary-button';

export default function App() {
  return (
    <View style={styles.container}>
      <Text accessibilityLabel="Emma Pilates Studio">Emma Pilates Studio</Text>
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
