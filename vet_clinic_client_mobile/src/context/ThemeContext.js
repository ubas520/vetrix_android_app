import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { colors, darkColors } from '../theme/colors';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isNightMode, setIsNightMode] = useState(false);
  const activeColors = isNightMode ? darkColors : colors;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(activeColors.background).catch(() => {});
    }
  }, [activeColors.background]);

  const value = useMemo(
    () => ({
      colors: activeColors,
      isNightMode,
      setNightMode: setIsNightMode,
      statusBarStyle: isNightMode ? 'light' : 'dark',
    }),
    [activeColors, isNightMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
