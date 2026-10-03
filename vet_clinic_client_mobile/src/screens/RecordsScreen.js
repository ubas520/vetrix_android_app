import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import EmptyState from '../components/EmptyState';
import HeaderBar from '../components/HeaderBar';
import NotificationPanel from '../components/NotificationPanel';
import PetAvatar from '../components/PetAvatar';
import RecordCard from '../components/RecordCard';
import StatusBadge from '../components/StatusBadge';
import { getVaccineStatus } from '../utils/careStatus';
import SegmentedControl from '../components/SegmentedControl';
import { RecordCardSkeleton } from '../components/Skeleton';
import { useClientData } from '../context/ClientDataContext';
import { usePetSelection } from '../context/PetSelectionContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { spacing } from '../theme/spacing';
import { formatDate } from '../utils/helpers';

export default function RecordsScreen() {
  const { colors } = useTheme();
  const { loading, medicalRecords, pets, vaccinationRecords } = useClientData();
  const { selectedPetId, setSelectedPetId } = usePetSelection();
  const refreshControl = useClientRefreshControl();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeType, setActiveType] = useState('Medical');

  const records = useMemo(() => {
    const source = activeType === 'Medical' ? medicalRecords : vaccinationRecords;
    return selectedPetId === 'All' ? source : source.filter((item) => String(item.petId) === String(selectedPetId));
  }, [activeType, medicalRecords, selectedPetId, vaccinationRecords]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <FlatList
        data={loading ? [] : records}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <>
            <HeaderBar onOpenNotifications={() => setPanelOpen(true)} />
            <Text style={[styles.title, { color: colors.ink }]}>Records</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>View your pet&apos;s medical and vaccination history.</Text>
            <SegmentedControl options={['Medical', 'Vaccination']} value={activeType} onChange={setActiveType} style={styles.segment} />

            <View style={styles.filterRow}>
              <PetFilter label="All Pets" selected={selectedPetId === 'All'} onPress={() => setSelectedPetId('All')} />
              {pets.map((pet) => (
                <PetFilter key={pet.id} label={pet.name} selected={String(selectedPetId) === String(pet.id)} onPress={() => setSelectedPetId(pet.id)} />
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View><RecordCardSkeleton /><RecordCardSkeleton /></View>
          ) : (
            <EmptyState title={`No ${activeType.toLowerCase()} records`} message="Only clinic-created records appear here." icon="records" />
          )
        }
        renderItem={({ item }) => activeType === 'Medical' ? <RecordCard record={item} /> : <VaccinationCard record={item} />}
      />
    </SafeAreaView>
  );
}

function PetFilter({ label, selected, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line }]}>
      <Text style={[styles.filterText, { color: selected ? '#FFFFFF' : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

function VaccinationCard({ record }) {
  const { colors } = useTheme();
  return (
    <AppCard reveal style={styles.vaccineCard}>
      <View style={styles.vaccineHead}>
        <PetAvatar name={record.petName} size={46} />
        <View style={styles.vaccineCopy}>
          <Text style={[styles.vaccinePet, { color: colors.ink }]}>{record.petName}</Text>
          <Text style={[styles.vaccineDate, { color: colors.muted }]}>Given {formatDate(record.dateGiven)}</Text>
          <Text style={[styles.vaccineDate, { color: colors.muted }]}>{record.vetName}</Text>
        </View>
      </View>
      <View style={styles.vaccineContent}>
        <Text style={[styles.vaccineTitle, { color: colors.ink }]}>{record.vaccineName}</Text>
        <Text style={[styles.vaccineText, { color: colors.muted }]}>{record.remarks}</Text>
        <StatusBadge status={getVaccineStatus(record.nextDueDate)} />
        <Text style={[styles.nextDue, { color: colors.primaryDark, backgroundColor: colors.primarySoft }]}>Next due {formatDate(record.nextDueDate)}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, marginBottom: spacing.md },
  segment: { marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  filterChip: { minHeight: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  filterText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  vaccineCard: { marginBottom: spacing.md },
  vaccineHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vaccineCopy: { flex: 1 },
  vaccinePet: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  vaccineDate: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  vaccineContent: { marginLeft: 58, marginTop: spacing.sm },
  vaccineTitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_800ExtraBold' },
  vaccineText: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  nextDue: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 5, fontSize: 12, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.sm },
});
