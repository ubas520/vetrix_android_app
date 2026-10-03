import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { getThemedStatusTone } from '../utils/statusStyles';

export default function StatusBadge({ status, label = status, compact = false }) {
  const { isNightMode, colors } = useTheme();
  const tone = getThemedStatusTone(status, colors, isNightMode);

  return (
    <View style={[styles.badge, compact && styles.compact, { backgroundColor: tone.background, borderColor: tone.border }]}> 
      <Text style={[styles.text, compact && styles.compactText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', maxWidth: '100%', flexShrink: 1, borderRadius: 9, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  compact: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  compactText: { fontSize: 12 },
});
