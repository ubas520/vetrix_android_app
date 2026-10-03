import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function ConnectionNotice({ error, onRetry, loading = false }) {
  const { colors } = useTheme();
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <AppIcon name="danger" color={colors.danger} size={19} />
      <Text style={[styles.message, { color: colors.ink }]}>{message || 'Unable to connect. Please try again.'}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Try Again" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onRetry} style={[styles.retry, { borderColor: colors.danger }]}>
          {loading ? <ActivityIndicator color={colors.danger} size="small" /> : <Text style={[styles.retryText, { color: colors.danger }]}>Try Again</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginVertical: 8 },
  message: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_600SemiBold' },
  retry: { minHeight: 44, minWidth: 76, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 9, paddingHorizontal: 8 },
  retryText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
});
