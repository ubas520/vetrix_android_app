import { Platform, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function StatCard({ label, value, style, accent }) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.surface, borderColor: colors.line },
      Platform.OS === 'web'
        ? styles.webShadow
        : { shadowColor: colors.shadow, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      style,
    ]}>
      <Text style={[styles.value, { color: accent || colors.primary }]}>{value}</Text>
      <Text numberOfLines={2} style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, minHeight: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, padding: spacing.sm, elevation: 1 },
  webShadow: { boxShadow: '0 4px 14px rgba(35,52,95,0.04)' },
  value: { fontSize: 22, lineHeight: 26, fontFamily: 'Manrope_800ExtraBold' },
  label: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_700Bold', textAlign: 'center', marginTop: 3 },
});
