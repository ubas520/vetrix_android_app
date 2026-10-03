import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function EmptyState({ title, message, icon = 'records' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.line }]}> 
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}> 
        <AppIcon name={icon} color={colors.primaryDark} size={24} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.muted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, borderRadius: spacing.radius, borderWidth: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  message: { textAlign: 'center', fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
});
