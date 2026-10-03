import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import EmptyState from '../components/EmptyState';
import PetAvatar from '../components/PetAvatar';
import PetQRCode from '../components/PetQRCode';
import StatusBadge from '../components/StatusBadge';
import StackHeader from '../components/StackHeader';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatDate, formatDateTime } from '../utils/helpers';
import { getStatusTone } from '../utils/statusStyles';
import { getPetStatusLabel, getVaccineStatus } from '../utils/careStatus';

export default function PetDetailsScreen({ navigation, route }) {
  const { colors: themeColors } = useTheme();
  const { appointments, medicalRecords, pets, vaccinationRecords } = useClientData();
  const refreshControl = useClientRefreshControl();
  const pet = pets.find((item) => String(item.id) === String(route.params?.petId)) || route.params?.pet;
  const petAppointments = appointments.filter((item) => String(item.petId) === String(pet?.id));
  const petRecords = medicalRecords.filter((item) => String(item.petId) === String(pet?.id));
  const petVaccines = vaccinationRecords.filter((item) => String(item.petId) === String(pet?.id));
  const isApproved = pet?.status === 'Approved';

  if (!pet) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={styles.container}>
          <StackHeader navigation={navigation} title="Pet Details" />
          <EmptyState title="Pet not found" message="This pet record is not available." icon="pets" />
        </View>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <StackHeader navigation={navigation} title="Pet Details" />

        <View
          style={[
            styles.hero,
            { backgroundColor: themeColors.surface, borderColor: themeColors.line, borderLeftColor: getStatusTone(pet.status).accent },
          ]}>
          <PetAvatar pet={pet} size={82} />
          <View style={styles.heroCopy}>
            <Text style={[styles.name, { color: themeColors.ink }]}>{pet.name}</Text>
            <Text style={[styles.meta, { color: themeColors.muted }]}>{pet.species} / {pet.breed}</Text>
            <StatusBadge status={pet.status} label={getPetStatusLabel(pet.status)} />
          </View>
        </View>

        {!isApproved ? (
          <AppCard style={[styles.card, { backgroundColor: themeColors.surfaceAlt }]}> 
            <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Verification Required</Text>
            <Text style={[styles.muted, { color: themeColors.muted }]}>{getVerificationMessage(pet.status)}</Text>
            {pet.verificationNotes ? <Text style={[styles.verificationNote, { backgroundColor: themeColors.cream, color: themeColors.warning }]}>Clinic note: {pet.verificationNotes}</Text> : null}
          </AppCard>
        ) : null}
        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Profile</Text>
          <View style={styles.grid}>
            <Detail label="Age" value={pet.age} />
            <Detail label="Gender" value={pet.gender} />
            <Detail label="Weight" value={pet.weight} />
            <Detail label="Color" value={pet.color} />
            <Detail label="Allergies" value={pet.allergies || 'None reported'} />
            <Detail label="Behavior and care" value={pet.notes || 'No notes saved'} />
            <Detail label="Registered" value={formatDate(pet.registeredDate)} />
          </View>
          {pet.criticalNotes ? <Text style={[styles.note, { backgroundColor: themeColors.cream }]}>Emergency: {pet.criticalNotes}</Text> : null}
          {pet.notes ? <Text style={[styles.note, { backgroundColor: themeColors.cream }]}>Important: {pet.notes}</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>QR Pet Retrieval</Text>
          {isApproved && pet.qrToken ? (
            <>
              <View style={[styles.qrBox, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}> 
                <PetQRCode key={pet.qrToken} token={pet.qrToken} petName={pet.name} small />
                <Text style={[styles.qrCode, { color: themeColors.primaryDark }]}>{pet.qrToken}</Text>
              </View>
              <Text style={[styles.muted, { color: themeColors.muted }]}>Scan with a phone camera to open this pet in the Vetrix web app. Clinic staff can sign in to view the record.</Text>
            </>
          ) : (
            <Text style={[styles.muted, { color: themeColors.muted }]}>{isApproved ? 'This pet has no active QR code. Contact the clinic to activate one.' : 'QR access becomes available only after the clinic approves this pet.'}</Text>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Appointments</Text>
          {petAppointments.length ? (
            petAppointments.map((item) => (
              <View key={item.id} style={[styles.listItem, { borderTopColor: themeColors.line }]}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: themeColors.ink }]}>{item.serviceType}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={[styles.muted, { color: themeColors.muted }]}>{formatDateTime(item.requestedDateTime)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.muted, { color: themeColors.muted }]}>No appointment history yet.</Text>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Medical Records</Text>
          {petRecords.length ? (
            petRecords.map((item) => (
              <View key={item.id} style={[styles.listItem, { borderTopColor: themeColors.line }]}>
                <Text style={[styles.itemTitle, { color: themeColors.ink }]}>{item.diagnosis}</Text>
                <Text style={[styles.muted, { color: themeColors.muted }]}>{formatDate(item.recordDate)} / {item.vetName}</Text>
                <Text style={[styles.muted, { color: themeColors.muted }]}>{item.vetRemarks}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.muted, { color: themeColors.muted }]}>No clinic-added medical records yet.</Text>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Vaccinations</Text>
          {petVaccines.length ? (
            petVaccines.map((item) => (
              <View key={item.id} style={[styles.listItem, { borderTopColor: themeColors.line }]}>
                <Text style={[styles.itemTitle, { color: themeColors.ink }]}>{item.vaccineName}</Text>
                <StatusBadge status={getVaccineStatus(item.nextDueDate)} />
                <Text style={[styles.muted, { color: themeColors.muted }]}>Given {formatDate(item.dateGiven)} / Next due {formatDate(item.nextDueDate)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.muted, { color: themeColors.muted }]}>No vaccination records yet.</Text>
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function getVerificationMessage(status) {
  if (status === 'Rejected') return 'The clinic did not approve this profile. Review its note and contact the clinic before trying again.';
  if (status === 'In Person Confirmation') return 'Bring this pet to the clinic so staff can confirm the profile in person.';
  return 'This profile is waiting for administrator review. Appointments, QR access, and clinic records stay locked until approval.';
}

function Detail({ label, value }) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.detailBox, { backgroundColor: themeColors.surfaceAlt }]}>
      <Text style={[styles.detailLabel, { color: themeColors.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: themeColors.ink }]}>{value || 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: spacing.radius,
    borderLeftWidth: 3,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  name: { color: colors.ink, fontSize: 22, fontFamily: 'Manrope_800ExtraBold' },
  meta: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  card: { marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 15, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailBox: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
  },
  detailLabel: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  detailValue: { color: colors.ink, fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  note: {
    marginTop: spacing.md,
    backgroundColor: colors.cream,
    color: colors.warning,
    borderRadius: spacing.radiusSm,
    padding: spacing.sm,
    lineHeight: 19,
    fontFamily: 'Manrope_700Bold',
  },
  verificationNote: {
    marginTop: spacing.sm,
    borderRadius: spacing.radiusSm,
    padding: spacing.sm,
    lineHeight: 18,
    fontFamily: 'Manrope_700Bold',
  },
  qrBox: {
    alignItems: 'center',
    borderRadius: spacing.radiusSm,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  qrCode: { color: colors.primaryDark, fontFamily: 'Manrope_700Bold', marginTop: spacing.sm, textAlign: 'center' },
  muted: { color: colors.muted, lineHeight: 19 },
  listItem: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  itemTitle: { color: colors.ink, fontFamily: 'Manrope_800ExtraBold', marginBottom: 2 },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  },
});
