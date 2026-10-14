import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { colors, darkColors } from '../theme/colors';
import { getStoredNightMode, setStoredNightMode } from '../utils/themeStorage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isNightMode, setIsNightMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const pendingSave = useRef(Promise.resolve());
  const activeColors = isNightMode ? darkColors : colors;

  useEffect(() => {
    let mounted = true;
    getStoredNightMode()
      .then((enabled) => {
        if (mounted) setIsNightMode(enabled);
      })
      .catch(() => {
        // Keep the default theme if device storage is unavailable.
      })
      .finally(() => {
        if (mounted) setThemeReady(true);
      });
    return () => { mounted = false; };
  }, []);

  const setNightMode = useCallback((enabled) => {
    setIsNightMode(enabled);
    // Serialize rapid toggles so an older save cannot overwrite the latest choice.
    pendingSave.current = pendingSave.current
      .then(() => setStoredNightMode(enabled))
      .catch(() => { console.warn('Could not save the theme preference.'); });
  }, []);

  useEffect(() => {
    if (themeReady && Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(activeColors.background).catch(() => {});
    }
  }, [activeColors.background, themeReady]);

  const value = useMemo(
    () => ({
      colors: activeColors,
      isNightMode,
      setNightMode,
      statusBarStyle: isNightMode ? 'light' : 'dark',
    }),
    [activeColors, isNightMode, setNightMode],
  );

  return <ThemeContext.Provider value={value}>{themeReady ? children : null}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
