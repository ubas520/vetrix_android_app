import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { formatDateTime } from '../utils/helpers';
import { getThemedStatusTone } from '../utils/statusStyles';
import AppCard from './AppCard';
import PetAvatar from './PetAvatar';
import StatusBadge from './StatusBadge';

export default function AppointmentCard({ appointment, onCancel, onRate }) {
  const { colors, isNightMode } = useTheme();
  const cancellable = ['Pending', 'Approved'].includes(appointment.status);
  const tone = getThemedStatusTone(appointment.status, colors, isNightMode);
  return (
    <AppCard compact reveal style={[styles.card, { borderLeftColor: tone.accent }]}> 
      <View style={styles.head}>
        <PetAvatar name={appointment.petName} size={42} />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.pet, { color: colors.ink }]}>{appointment.petName}</Text>
            <StatusBadge status={appointment.status} compact />
          </View>
          <Text style={[styles.service, { color: colors.muted }]}>{appointment.service || appointment.serviceType}</Text>
        </View>
      </View>
      <Text style={[styles.time, { color: colors.inkSoft }]}>{formatDateTime(appointment.requestedDateTime)}</Text>
      <Text numberOfLines={2} style={[styles.note, { color: colors.muted }]}>{appointment.concern}</Text>
      <View style={styles.footer}>
        <Text style={[styles.vet, { color: colors.primaryDark }]}>{appointment.assignedVet}</Text>
        {cancellable && onCancel ? (
          <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.cancel, { backgroundColor: colors.dangerSoft }]}> 
            <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
      {appointment.feedback ? (
        <View style={[styles.rating, { borderTopColor: colors.line }]}>
          <Text accessibilityLabel={`Your rating: ${appointment.feedback.rating} out of 5 stars`} style={[styles.ratingText, { color: colors.primaryDark }]}>
            Your rating: {'★'.repeat(appointment.feedback.rating)}{'☆'.repeat(5 - appointment.feedback.rating)}
          </Text>
          {appointment.feedback.comment ? <Text style={[styles.note, { color: colors.muted }]}>{appointment.feedback.comment}</Text> : null}
        </View>
      ) : appointment.status === 'Completed' && onRate ? (
        <Pressable accessibilityRole="button" onPress={onRate} style={[styles.rateButton, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.ratingText, { color: colors.primaryDark }]}>Rate your visit</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, borderLeftWidth: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pet: { flex: 1, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  service: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 2 },
  time: { fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: spacing.md },
  note: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  footer: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  vet: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  cancel: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 8 },
  cancelText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  rating: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1 },
  ratingText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  rateButton: { minHeight: 44, marginTop: spacing.sm, borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
});
