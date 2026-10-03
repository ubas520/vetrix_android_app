import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { formatDate } from '../utils/helpers';
import AppCard from './AppCard';
import PetAvatar from './PetAvatar';

export default function RecordCard({ record }) {
  const { colors } = useTheme();
  return (
    <AppCard reveal style={styles.card}>
      <View style={styles.row}>
        <PetAvatar name={record.petName} size={46} />
        <View style={styles.copy}>
          <Text style={[styles.pet, { color: colors.ink }]}>{record.petName}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{formatDate(record.recordDate)}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{record.vetName}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.ink }]}>{record.diagnosis}</Text>
        <Text style={[styles.remarks, { color: colors.muted }]}>{record.vetRemarks}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  pet: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  date: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  content: { marginLeft: 58, marginTop: spacing.sm },
  title: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_800ExtraBold' },
  remarks: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
});
