import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { useMotion } from '../context/MotionContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export function SkeletonBlock({ height = 12, radius = 7, style, width = '100%' }) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    if (reduceMotion) return undefined;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.lineStrong, opacity }, style]} />;
}

export function PetCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.row}><SkeletonBlock width={62} height={62} radius={31} /><View style={styles.copy}><SkeletonBlock width="46%" height={17} /><SkeletonBlock width="68%" height={10} style={styles.gap} /></View></View>
      <SkeletonBlock height={66} radius={10} style={styles.section} />
      <View style={styles.row}><SkeletonBlock width="48%" height={40} radius={10} /><SkeletonBlock width="48%" height={40} radius={10} /></View>
    </View>
  );
}

export function AppointmentCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.row}><SkeletonBlock width={44} height={44} radius={22} /><View style={styles.copy}><SkeletonBlock width="42%" height={15} /><SkeletonBlock width="64%" height={9} style={styles.gap} /></View></View>
      <SkeletonBlock width="58%" height={10} style={styles.section} />
      <SkeletonBlock width="88%" height={9} style={styles.gap} />
    </View>
  );
}

export function RecordCardSkeleton() {
  return <AppointmentCardSkeleton />;
}

export function ProductCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <SkeletonBlock width={66} height={66} radius={16} />
      <View style={styles.copy}>
        <SkeletonBlock width="32%" height={8} />
        <SkeletonBlock width="68%" height={15} style={styles.gap} />
        <SkeletonBlock width="42%" height={12} style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: spacing.radius, padding: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  gap: { marginTop: spacing.sm },
  section: { marginTop: spacing.md },
  productCard: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: spacing.radiusSm, padding: spacing.md, marginBottom: spacing.sm },
});
