import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { getPetStatusLabel } from '../utils/careStatus';
import { getThemedStatusTone } from '../utils/statusStyles';
import AppCard from './AppCard';
import AppIcon from './AppIcon';
import PetAvatar from './PetAvatar';
import StatusBadge from './StatusBadge';

export default function PetCard({ pet, onPress, onRequestEdit }) {
  const { colors, isNightMode } = useTheme();
  const tone = getThemedStatusTone(pet.status, colors, isNightMode);

  return (
    <AppCard reveal style={[styles.card, { borderLeftColor: tone.accent }]}> 
      <View style={styles.head}>
        <PetAvatar pet={pet} size={52} />
        <View style={styles.titleCopy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.ink }]}>{pet.name}</Text>
            
          </View>
          <Text style={[styles.meta, { color: colors.muted }]}>{pet.breed || pet.species}</Text>
          <StatusBadge status={pet.status} label={getPetStatusLabel(pet.status)} compact />
        </View>
      </View>

      <View style={styles.actions}>
        {pet.status === 'Approved' ? <Pressable accessibilityRole="button" onPress={onRequestEdit} style={[styles.secondary, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
          <AppIcon name="edit" color={colors.primaryDark} size={15} />
          <Text style={[styles.secondaryText, { color: colors.primaryDark }]}>Request Changes</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onPress} style={[styles.primary, { backgroundColor: colors.primarySoft }]}> 
          <Text style={[styles.primaryText, { color: colors.primaryDark }]}>View Profile</Text>
          <AppIcon name="forward" color={colors.primaryDark} size={16} />
        </Pressable>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, borderLeftWidth: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleCopy: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: 'row' },
  name: { flex: 1, fontSize: 19, fontFamily: 'Manrope_800ExtraBold' },
  meta: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondary: { minHeight: 44, flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, padding: spacing.sm },
  secondaryText: { flexShrink: 1, fontSize: 13, textAlign: 'center', fontFamily: 'Manrope_800ExtraBold' },
  primary: { minHeight: 44, flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: 10, padding: spacing.sm },
  primaryText: { flexShrink: 1, fontSize: 13, textAlign: 'center', fontFamily: 'Manrope_800ExtraBold' },
});
