import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function SegmentedControl({ options, value, onChange, compact = false, style }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {options.map((option) => {
        const item = typeof option === 'string' ? { label: option, value: option } : option;
        const selected = item.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              styles.item,
              compact && styles.compact,
              selected && { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, compact && styles.compactLabel, { color: selected ? '#FFFFFF' : colors.inkSoft }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: 44,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
  },
  item: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  compact: { minHeight: 32 },
  label: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  compactLabel: { fontSize: 13 },
  pressed: { opacity: 0.76 },
});
