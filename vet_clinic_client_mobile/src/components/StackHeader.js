import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';

export default function StackHeader({ navigation, title, action }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Go back"
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}>
        <AppIcon name="back" color={colors.primaryDark} size={20} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {action || <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  button: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  spacer: { width: 40, height: 40 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
