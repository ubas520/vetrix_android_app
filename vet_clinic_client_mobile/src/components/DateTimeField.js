import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function DateTimeField({ error, label, maximumDate, minimumDate, mode = 'date', onChange, value }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = mode === 'date' ? parseDate(value) : parseTime(value);

  return (
    <View>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.nativeField, { backgroundColor: colors.surfaceAlt, borderColor: error ? colors.danger : colors.line }]}>
        <AppIcon name={mode === 'date' ? 'appointment' : 'clock'} color={colors.primaryDark} size={16} />
        <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          mode={mode}
          value={dateValue}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onValueChange={(_, selected) => {
            setOpen(Platform.OS === 'ios');
            onChange(mode === 'date' ? formatDateValue(selected) : formatTimeValue(selected));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function parseDate(value) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseTime(value) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const date = new Date();
  if (!match) return date;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeValue(date) {
  const period = date.getHours() >= 12 ? 'PM' : 'AM';
  const hour = date.getHours() % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginBottom: 5 },
  nativeField: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md },
  value: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  error: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
