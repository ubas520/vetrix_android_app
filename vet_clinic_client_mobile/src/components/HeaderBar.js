import { useNavigation } from '@react-navigation/native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useClientData } from '../context/ClientDataContext';
import { useNotifications } from '../context/NotificationContext';
import { usePetSelection } from '../context/PetSelectionContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppIcon from './AppIcon';
import ClientDataNotice from './ClientDataNotice';
import { getPetStatusLabel } from '../utils/careStatus';
import NotificationBell from './NotificationBell';
import PetAvatar from './PetAvatar';

export default function HeaderBar({ onOpenNotifications }) {
  const navigation = useNavigation();
  const { client } = useAuth();
  const { pets, profile } = useClientData();
  const { unreadCount } = useNotifications();
  const { selectedPet, selectedPetId, setSelectedPetId } = usePetSelection();
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const firstName = client?.firstName || profile?.firstName || 'Client';

  return (
    <>
    <View style={[styles.topbar, { borderBottomColor: colors.line }]}> 
      <View style={styles.left}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}> 
          <AppIcon name="pets" color="#FFFFFF" size={22} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.brand, { color: colors.ink }]}>Vetrix</Text>
          <Text numberOfLines={1} style={[styles.portal, { color: colors.muted }]}>Client Portal - {firstName}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selectedPet ? `Selected pet ${selectedPet.name}` : 'Select a pet'}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.petSwitch, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}>
          {selectedPet ? <PetAvatar pet={selectedPet} size={26} /> : <AppIcon name="pets" color={colors.primaryDark} size={17} />}
          <AppIcon name="down" color={colors.muted} size={13} />
        </Pressable>
        <NotificationBell count={unreadCount} onPress={onOpenNotifications} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => navigation.navigate('Profile')}
          style={({ pressed }) => [styles.action, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}>
          <AppIcon name="profile" color={colors.primaryDark} size={20} />
        </Pressable>
      </View>
      <Modal animationType="fade" onRequestClose={() => setPickerOpen(false)} transparent visible={pickerOpen}>
        <Pressable onPress={() => setPickerOpen(false)} style={[styles.backdrop, { backgroundColor: colors.overlay }]}> 
          <Pressable style={[styles.picker, { backgroundColor: colors.surfaceRaised, borderColor: colors.line }]}>
            <Text style={[styles.pickerTitle, { color: colors.ink }]}>Active pet</Text>
            <Text style={[styles.pickerNote, { color: colors.muted }]}>Updates Home, Records, QR, and booking defaults.</Text>
            <PetOption
              active={selectedPetId === 'All'}
              label="All pets"
              onPress={() => {
                setSelectedPetId('All');
                setPickerOpen(false);
              }}
            />
            {pets.map((pet) => (
              <PetOption
                active={String(selectedPetId) === String(pet.id)}
                key={pet.id}
                pet={pet}
                label={pet.name}
                onPress={() => {
                  setSelectedPetId(pet.id);
                  setPickerOpen(false);
                }}
              />
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    <ClientDataNotice />
    </>
  );
}

function PetOption({ active, label, onPress, pet }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.petOption, { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.line }]}>
      {pet ? <PetAvatar pet={pet} size={34} /> : <View style={[styles.allPets, { backgroundColor: colors.primarySoft }]}><AppIcon name="pets" color={colors.primaryDark} size={17} /></View>}
      <View style={styles.petOptionCopy}>
        <Text style={[styles.petOptionName, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.petOptionNote, { color: colors.muted }]}>{pet ? `${pet.breed} - ${getPetStatusLabel(pet.status)}` : 'Show every pet'}</Text>
      </View>
      {active ? <AppIcon name="check" color={colors.primary} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginHorizontal: -spacing.screen,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    marginBottom: spacing.lg,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm },
  brandMark: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  brand: { fontSize: 17, fontFamily: 'Manrope_800ExtraBold' },
  portal: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petSwitch: { minWidth: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 13, borderWidth: 1, paddingHorizontal: 5 },
  action: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: spacing.screen, paddingTop: 76 },
  picker: { alignSelf: 'flex-end', width: '88%', maxWidth: 340, borderRadius: spacing.radius, borderWidth: 1, padding: spacing.md },
  pickerTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  pickerNote: { fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: spacing.sm },
  petOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, padding: spacing.sm, marginTop: 6 },
  petOptionCopy: { flex: 1, minWidth: 0 },
  petOptionName: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  petOptionNote: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 1 },
  allPets: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
