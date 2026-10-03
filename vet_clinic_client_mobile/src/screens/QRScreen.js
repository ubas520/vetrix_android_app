import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import EmptyState from '../components/EmptyState';
import PetAvatar from '../components/PetAvatar';
import PetQRCode from '../components/PetQRCode';
import StackHeader from '../components/StackHeader';
import StatusBadge from '../components/StatusBadge';
import { getPetStatusLabel } from '../utils/careStatus';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import { usePetSelection } from '../context/PetSelectionContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { spacing } from '../theme/spacing';

export default function QRScreen({ navigation }) {
  const { colors } = useTheme();
  const { pets } = useClientData();
  const { selectedPetId, setSelectedPetId } = usePetSelection();
  const refreshControl = useClientRefreshControl();
  const activePetId = selectedPetId === 'All' || !pets.some((pet) => String(pet.id) === String(selectedPetId))
    ? pets.find((pet) => pet.qrToken && pet.status === 'Approved')?.id || pets[0]?.id
    : selectedPetId;
  const activePet = useMemo(
    () => pets.find((pet) => String(pet.id) === String(activePetId)),
    [activePetId, pets],
  );
  const token = activePet?.qrToken || '';
  const isActive = Boolean(token) && activePet?.status === 'Approved';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <StackHeader navigation={navigation} title="Pet QR" />
        <Text style={[styles.title, { color: colors.ink }]}>QR Pet Retrieval</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Scan with a phone camera to open your pet&apos;s record in the Vetrix web app.</Text>

        <View style={styles.petPicker}>
          {pets.map((pet) => {
            const active = String(activePetId) === String(pet.id);
            return <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.petChip, { backgroundColor: active ? colors.accentSoft : colors.surface, borderColor: active ? colors.accent : colors.line }]}><Text style={[styles.petChipText, { color: active ? colors.success : colors.inkSoft }]}>{pet.name}</Text></Pressable>;
          })}
        </View>

        {activePet ? <AppCard style={styles.qrCard}>
          {isActive ? <PetQRCode key={token} token={token} petName={activePet.name} /> : (
            <EmptyState icon="qr" title="QR unavailable" message={activePet.status === 'Approved' ? 'This pet has no active QR code. Contact the clinic to activate one.' : 'QR access becomes active after clinic approval.'} />
          )}
          <View style={styles.petRow}>
            <PetAvatar pet={activePet} size={48} />
            <View style={styles.petCopy}><Text style={[styles.petName, { color: colors.ink }]}>{activePet.name}</Text>{isActive ? <Text selectable style={[styles.token, { color: colors.primary }]}>{token}</Text> : null}</View>
            <StatusBadge label={getPetStatusLabel(activePet?.status || 'Pending')} status={activePet?.status || 'Pending'} compact />
          </View>
          {isActive ? <Text style={[styles.note, { color: colors.muted }]}>Clinic staff can sign in to the web app to view the protected record.</Text> : null}
        </AppCard> : <EmptyState icon="pets" title="No pets yet" message="Add a pet and wait for clinic approval to receive its QR code." />}

        <AppCard style={styles.stepsCard}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>How this QR works</Text>
          <Step number="1" title="Scan the QR code" text="Point a phone camera at the code and tap the link." />
          <Step number="2" title="Sign in to Vetrix" text="Clinic staff sign in with their authorized web account." />
          <Step number="3" title="View the pet record" text="The web app opens the matching pet and retrieval details." />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ number, title, text }) {
  const { colors } = useTheme();
  return <View style={[styles.step, { borderTopColor: colors.lineNeutral }]}><View style={[styles.stepNumber, { backgroundColor: colors.primarySoft }]}><Text style={[styles.stepNumberText, { color: colors.primaryDark }]}>{number}</Text></View><View style={styles.stepCopy}><Text style={[styles.stepTitle, { color: colors.ink }]}>{title}</Text><Text style={[styles.stepText, { color: colors.muted }]}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Manrope_800ExtraBold' }, subtitle: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, marginBottom: spacing.md },
  petPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  petChip: { minHeight: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md }, petChipText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  qrCard: { alignItems: 'center', marginBottom: spacing.md },
  petRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }, petCopy: { flex: 1 }, petName: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' }, token: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: spacing.sm }, stepsCard: { marginBottom: spacing.md }, sectionTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.xs },
  step: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingVertical: spacing.sm }, stepNumber: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' }, stepCopy: { flex: 1 }, stepTitle: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' }, stepText: { fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
});
