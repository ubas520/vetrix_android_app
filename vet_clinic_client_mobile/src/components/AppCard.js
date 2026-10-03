import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AnimatedReveal from './AnimatedReveal';

export default function AppCard({ children, compact = false, delay = 0, elevated = true, reveal = false, style, tone = 'default' }) {
  const { colors } = useTheme();
  const tones = {
    default: colors.surface,
    blue: colors.primarySoft,
    lavender: colors.lavender,
    mint: colors.mint,
    warm: colors.cream,
    peach: colors.peach,
  };

  const card = (
    <View
      style={[
        styles.card,
        { backgroundColor: tones[tone] || colors.surface, borderColor: colors.line },
        Platform.OS === 'web'
          ? styles.webShadow
          : { shadowColor: colors.shadow, shadowOpacity: 0.055, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
        compact && styles.compact,
        !elevated && styles.flat,
        style,
      ]}>
      {children}
    </View>
  );

  return reveal ? <AnimatedReveal delay={delay}>{card}</AnimatedReveal> : card;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    padding: spacing.lg,
    elevation: 2,
  },
  webShadow: { boxShadow: '0 8px 24px rgba(35,52,95,0.07)' },
  compact: { padding: spacing.md, borderRadius: spacing.radiusSm },
  flat: { elevation: 0, ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, shadowRadius: 0 }) },
});
