import { Platform, RefreshControl } from 'react-native';

import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';

export default function useClientRefreshControl() {
  const { refresh, refreshing } = useClientData();
  const { colors } = useTheme();

  if (Platform.OS === 'web') return undefined;

  return (
    <RefreshControl
      colors={[colors.primary]}
      onRefresh={refresh}
      progressBackgroundColor={colors.surface}
      refreshing={refreshing}
      tintColor={colors.primary}
    />
  );
}
