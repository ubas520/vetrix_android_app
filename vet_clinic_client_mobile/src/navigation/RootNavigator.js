import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ClientDataProvider } from '../context/ClientDataContext';
import { NotificationProvider } from '../context/NotificationContext';
import { PetSelectionProvider } from '../context/PetSelectionContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

function NavigationContent() {
  const { isRestoring, isSignedIn } = useAuth();
  const { colors, isNightMode } = useTheme();
  const baseTheme = isNightMode ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isNightMode,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      border: colors.line,
      card: colors.surface,
      notification: colors.primary,
      primary: colors.primary,
      text: colors.ink,
    },
  };

  if (isRestoring) {
    return (
      <View
        accessibilityLabel="Restoring your Vetrix session"
        accessibilityRole="progressbar"
        style={[styles.loading, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <NavigationContainer theme={navigationTheme}>{isSignedIn ? <MainStack /> : <AuthStack />}</NavigationContainer>;
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <ClientDataProvider>
        <PetSelectionProvider>
          <NotificationProvider>
            <NavigationContent />
          </NotificationProvider>
        </PetSelectionProvider>
      </ClientDataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
