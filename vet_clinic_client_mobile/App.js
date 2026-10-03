import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackProvider } from './src/context/FeedbackContext';
import { MotionProvider } from './src/context/MotionContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { fontAssets } from './src/theme/typography';

function AppShell() {
  const { colors, statusBarStyle } = useTheme();
  const appShadow = Platform.OS === 'web'
    ? { boxShadow: `0 10px 42px ${colors.overlay}` }
    : { shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 10 } };

  return (
    <View style={[styles.stage, { backgroundColor: colors.canvas }]}> 
      <View style={[styles.app, { backgroundColor: colors.background }, appShadow]}> 
        <RootNavigator />
        <StatusBar style={statusBarStyle} backgroundColor="transparent" translucent />
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <MotionProvider>
        <ThemeProvider>
          <FeedbackProvider>
            <AppShell />
          </FeedbackProvider>
        </ThemeProvider>
      </MotionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
  },
  app: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 480,
      },
    }),
  },
});
