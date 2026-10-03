import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function AppButton({ title, icon, onPress, variant = 'primary', compact = false, disabled = false, loading = false, style }) {
  const { colors } = useTheme();
  const palette = {
    primary: { background: colors.primaryDark, border: colors.primaryDark, text: colors.surface },
    secondary: { background: colors.primarySoft, border: colors.primarySoft, text: colors.primaryDark },
    outline: { background: colors.surface, border: colors.lineStrong, text: colors.primaryDark },
    danger: { background: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: palette.background, borderColor: palette.border },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={palette.text} size="small" /> : icon ? <AppIcon name={icon} color={palette.text} size={compact ? 16 : 18} /> : null}
        <Text numberOfLines={2} style={[styles.text, compact && styles.compactText, { color: palette.text }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 46, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  compact: { minHeight: 44, paddingHorizontal: spacing.md },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  text: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  compactText: { fontSize: 13 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78 },
});
