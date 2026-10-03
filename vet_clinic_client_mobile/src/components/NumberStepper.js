import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function NumberStepper({ error, label, max = 100, min = 0.1, onChange, step = 0.1, value }) {
  const { colors } = useTheme();
  const parsed = Number(value) || 0;
  const changeBy = (amount) => onChange(String(Math.min(max, Math.max(min, parsed + amount)).toFixed(1)));

  return (
    <View>
      {label ? <Text style={[styles.label, { color: colors.ink }]}>{label}</Text> : null}
      <View style={[styles.control, { backgroundColor: colors.surfaceAlt, borderColor: error ? colors.danger : colors.line }]}>
        <Pressable accessibilityLabel="Decrease weight" onPress={() => changeBy(-step)} style={[styles.button, { backgroundColor: colors.surface }]}>
          <AppIcon name="minus" color={colors.primaryDark} size={16} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
          style={[styles.input, { color: colors.ink }]}
        />
        <Text style={[styles.unit, { color: colors.muted }]}>kg</Text>
        <Pressable accessibilityLabel="Increase weight" onPress={() => changeBy(step)} style={[styles.button, { backgroundColor: colors.surface }]}>
          <AppIcon name="plus" color={colors.primaryDark} size={16} />
        </Pressable>
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginBottom: 5 },
  control: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 4 },
  button: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: 'Manrope_700Bold', fontSize: 14, outlineStyle: 'none' },
  unit: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, marginHorizontal: spacing.sm },
  error: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
