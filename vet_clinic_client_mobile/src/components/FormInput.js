import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function FormInput({ error, icon, label, multiline, right, style, inputStyle, ...props }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { color: colors.ink }]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          multiline && styles.multilineField,
          { backgroundColor: colors.surfaceAlt, borderColor: error ? colors.danger : focused ? colors.primary : colors.line },
        ]}>
        {icon ? <AppIcon name={icon} color={focused ? colors.primary : colors.mutedSoft} size={17} /> : null}
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          multiline={multiline}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={props.placeholderTextColor || colors.mutedSoft}
          selectionColor={colors.primary}
          style={[styles.input, multiline && styles.multiline, { color: colors.ink }, inputStyle]}
        />
        {right}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginBottom: 5 },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md },
  multilineField: { minHeight: 84, alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: { flex: 1, minWidth: 0, minHeight: 44, padding: 0, fontFamily: 'Manrope_600SemiBold', fontSize: 14, outlineStyle: 'none' },
  multiline: { minHeight: 68, paddingTop: 3, textAlignVertical: 'top' },
  error: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
