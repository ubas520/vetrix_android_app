import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function NotificationBell({ count = 0, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open notifications${count ? `, ${count} unread` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.bell, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}>
      <AppIcon name="alerts" color={colors.primaryDark} size={22} strokeWidth={2} />
      {count > 0 ? (
        <View
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Text style={[styles.badgeText, { color: colors.surface }]}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  badge: { position: 'absolute', right: -4, top: -4, minWidth: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 12, lineHeight: 16, includeFontPadding: false, textAlign: 'center', fontFamily: 'Manrope_800ExtraBold' },
});
