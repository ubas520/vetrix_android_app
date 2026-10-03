import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function DateTimeField({ error, label, maximumDate, minimumDate, mode = 'date', onChange, value }) {
  const { colors } = useTheme();
  const webValue = mode === 'date' ? value : toWebTime(value);

  return (
    <View>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: colors.surfaceAlt, borderColor: error ? colors.danger : colors.line }]}> 
        <AppIcon name={mode === 'date' ? 'appointment' : 'clock'} color={colors.primaryDark} size={16} />
        <TextInput
          accessibilityLabel={label}
          max={mode === 'date' ? formatWebDate(maximumDate) : undefined}
          min={mode === 'date' ? formatWebDate(minimumDate) : undefined}
          type={mode}
          value={webValue}
          onChangeText={(next) => onChange(mode === 'date' ? next : fromWebTime(next))}
          style={[styles.input, { color: colors.ink }]}
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function parseTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const date = new Date();
  if (!match) return date;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

function toWebTime(value) {
  const date = parseTime(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function fromWebTime(value) {
  const [hour = '9', minute = '30'] = value.split(':');
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  const period = date.getHours() >= 12 ? 'PM' : 'AM';
  const displayHour = date.getHours() % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${period}`;
}

function formatWebDate(value) {
  if (!value) return undefined;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginBottom: 5 },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md },
  input: { flex: 1, minWidth: 0, minHeight: 44, fontFamily: 'Manrope_600SemiBold', fontSize: 14, borderWidth: 0, outlineStyle: 'none' },
  error: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
