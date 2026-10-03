import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appImages } from '../assets/images';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import { getVaccineStatus } from '../utils/careStatus';
import AppIcon from '../components/AppIcon';
import HeaderBar from '../components/HeaderBar';
import NotificationPanel from '../components/NotificationPanel';
import PetAvatar from '../components/PetAvatar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ThemedArtwork from '../components/ThemedArtwork';
import { useAuth } from '../context/AuthContext';
import { useClientData } from '../context/ClientDataContext';
import { useNotifications } from '../context/NotificationContext';
import { usePetSelection } from '../context/PetSelectionContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { spacing } from '../theme/spacing';
import { formatDate, formatDateTime } from '../utils/helpers';

export default function HomeScreen({ navigation }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const { client } = useAuth();
  const { appointments, pets, profile, vaccinationRecords } = useClientData();
  const { unreadCount } = useNotifications();
  const { selectedPet } = usePetSelection();
  const { colors, isNightMode } = useTheme();
  const refreshControl = useClientRefreshControl();
  const firstName = client?.firstName || profile?.firstName || 'Client';
  const visiblePets = selectedPet ? [selectedPet] : pets;
  const visibleAppointments = selectedPet ? appointments.filter((item) => item.petId === selectedPet.id) : appointments;
  const visibleVaccines = selectedPet ? vaccinationRecords.filter((item) => item.petId === selectedPet.id) : vaccinationRecords;
  const pendingPets = visiblePets.filter((pet) => pet.status === 'Pending');
  const pendingAppointments = visibleAppointments.filter((item) => item.status === 'Pending');
  const approvedAppointments = visibleAppointments.filter((item) => item.status === 'Approved');
  const upcomingAppointments = [...pendingAppointments, ...approvedAppointments].filter(
    (item) => new Date(item.scheduledDateTime || item.requestedDateTime) >= new Date(),
  );
  const nextAppointment = upcomingAppointments.sort(
    (a, b) => new Date(a.scheduledDateTime || a.requestedDateTime) - new Date(b.scheduledDateTime || b.requestedDateTime),
  )[0];
  const nextVaccine = useMemo(
    () => visibleVaccines.filter((item) => getVaccineStatus(item.nextDueDate) !== 'No due date').sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))[0],
    [visibleVaccines],
  );
  const overdueVaccine = useMemo(
    () => [...visibleVaccines]
      .filter((item) => getVaccineStatus(item.nextDueDate) === 'Overdue')
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))[0],
    [visibleVaccines],
  );

  const priority = getHomePriority({
    colors,
    nextAppointment,
    nextVaccine,
    overdueVaccine,
    pendingPets,
    unreadCount,
    onAppointments: () => navigation.navigate('Book'),
    onNotifications: () => setPanelOpen(true),
    onPets: () => navigation.navigate('Pets'),
    onRecords: () => navigation.navigate('Records'),
  });

  const attention = [
    {
      key: 'pets',
      icon: 'pets',
      title: pendingPets.length ? 'Pet verification' : 'Pet profiles verified',
      detail: pendingPets.length ? `${pendingPets.length} pet profile${pendingPets.length === 1 ? '' : 's'} under review` : 'All profiles are ready to use',
      status: pendingPets.length ? 'Waiting for clinic' : 'Approved',
      onPress: () => navigation.navigate('Pets'),
    },
    {
      key: 'alerts',
      icon: 'alerts',
      title: unreadCount ? 'Unread clinic alerts' : 'Notifications are clear',
      detail: unreadCount ? `${unreadCount} new clinic update${unreadCount === 1 ? '' : 's'}` : 'Nothing needs your attention',
      status: unreadCount ? 'Unread' : 'Read',
      onPress: () => setPanelOpen(true),
    },
    {
      key: 'vaccine',
      icon: 'vaccine',
      title: 'Next vaccine reminder',
      detail: nextVaccine ? `${nextVaccine.petName} - ${formatDate(nextVaccine.nextDueDate)}` : 'No due date listed',
      status: getVaccineStatus(nextVaccine?.nextDueDate),
      onPress: () => navigation.navigate('Records'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <HeaderBar onOpenNotifications={() => setPanelOpen(true)} />

        <AppCard style={styles.nextCard}>
          <View style={styles.nextTop}>
            <Text style={[styles.kicker, { color: colors.primaryDark }]}>{nextAppointment ? 'Next Appointment' : 'Appointments'}</Text>
            {nextAppointment ? <StatusBadge status={nextAppointment.status} /> : null}
          </View>
          <View style={styles.nextBody}>
            {nextAppointment ? <PetAvatar pet={pets.find((pet) => String(pet.id) === String(nextAppointment.petId))} name={nextAppointment.petName} size={52} /> : <AppIcon name="appointment" color={colors.primaryDark} size={32} />}
            <View style={styles.nextCopy}>
              <Text style={[styles.nextName, { color: colors.ink }]}>{nextAppointment?.petName || 'Plan your next clinic visit'}</Text>
              <Text style={[styles.nextDate, { color: colors.muted }]}>
                {nextAppointment ? formatDateTime(nextAppointment.scheduledDateTime || nextAppointment.requestedDateTime) : 'Book when your pet needs care'}
              </Text>
              {nextAppointment ? <Text style={[styles.nextService, { color: colors.inkSoft }]}>{nextAppointment.serviceType}</Text> : null}
            </View>
          </View>
          <AppButton title="Book a Visit" icon="appointment" onPress={() => navigation.navigate('Book', { startBooking: true })} style={styles.bookButton} />
        </AppCard>

        <ThemedArtwork source={appImages.homeHero} style={styles.hero} imageStyle={styles.heroArt}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, isNightMode && styles.heroTitleNight]}>Hi, {firstName}!</Text>
            <Text style={[styles.heroText, isNightMode && styles.heroTextNight]}>{selectedPet ? `${selectedPet.name}'s care at a glance.` : 'Your pets, cared for.'}</Text>
          </View>
        </ThemedArtwork>

        <Pressable accessibilityRole="button" onPress={priority.onPress} style={[styles.priority, { backgroundColor: priority.background, borderColor: priority.border }]}>
          <View style={[styles.priorityIcon, { backgroundColor: colors.surface }]}><AppIcon name={priority.icon} color={priority.color} size={19} /></View>
          <View style={styles.priorityCopy}><Text style={[styles.priorityKicker, { color: priority.color }]}>Care update</Text><Text style={[styles.priorityTitle, { color: colors.ink }]}>{priority.title}</Text><Text style={[styles.priorityNote, { color: colors.muted }]}>{priority.note}</Text></View>
          <AppIcon name="forward" color={priority.color} size={17} />
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Care reminders</Text>
          <Pressable onPress={() => setPanelOpen(true)}><Text style={[styles.link, { color: colors.primary }]}>Clinic alerts</Text></Pressable>
        </View>
        <AppCard compact style={styles.actionCard}>
          {attention.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={item.onPress}
              style={[styles.actionRow, index > 0 && { borderTopColor: colors.lineNeutral, borderTopWidth: 1 }]}>
              <View style={[styles.actionIcon, { backgroundColor: item.key === 'pets' ? colors.amberSoft : colors.primarySoft }]}>
                <AppIcon name={item.icon} color={item.key === 'pets' ? colors.amber : colors.primary} size={19} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: colors.ink }]}>{item.title}</Text>
                <Text style={[styles.actionDetail, { color: colors.muted }]}>{item.detail}</Text>
                <View style={styles.reminderBadge}><StatusBadge status={item.status} compact /></View>
              </View>
              <AppIcon name="forward" color={colors.muted} size={18} />
            </Pressable>
          ))}
        </AppCard>

        <Text style={[styles.sectionTitle, styles.toolsTitle, { color: colors.ink }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="pets" label="My Pets" onPress={() => navigation.navigate('Pets')} />
          <QuickAction icon="appointment" label="Book Visit" onPress={() => navigation.navigate('Book')} />
          <QuickAction icon="store" label="Clinic Products" onPress={() => navigation.getParent()?.navigate('ProductCatalog')} />
          <QuickAction icon="mapPin" label="Clinic Directions" onPress={() => navigation.getParent()?.navigate('ClinicDirections')} />
        </View>

        <Text style={[styles.sectionTitle, styles.summaryTitle, { color: colors.ink }]}>Care summary</Text>
        <View style={styles.stats}>
          <StatCard value={visiblePets.length} label={selectedPet ? 'Selected pet' : 'Pets under care'} style={styles.statTile} />
          <StatCard value={upcomingAppointments.length} label="Upcoming visits" style={styles.statTile} />
          <StatCard value={unreadCount} label="Unread alerts" accent={colors.coral} style={styles.statTile} />
          <StatCard value={nextVaccine ? visibleVaccines.length : 0} label="Vaccines tracked" style={styles.statTile} />
        </View>

        <Pressable
          accessibilityLabel="Open Vetrix Assistant"
          onPress={() => navigation.getParent()?.navigate('Chat')}
          style={({ pressed }) => [
            styles.assistant,
            { backgroundColor: colors.primary },
            Platform.OS === 'web'
              ? styles.assistantWeb
              : { shadowColor: colors.shadow, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            pressed && styles.pressed,
          ]}> 
          <View style={styles.assistantIcon}><AppIcon name="assistant" color={colors.primary} size={18} /></View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantText}>Ask Vetrix Assistant</Text>
            <Text style={styles.assistantNote}>General pet-care guidance</Text>
          </View>
          <AppIcon name="forward" color="#FFFFFF" size={17} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getHomePriority({ colors, nextAppointment, nextVaccine, onAppointments, onNotifications, onPets, onRecords, overdueVaccine, pendingPets, unreadCount }) {
  if (overdueVaccine) {
    return { icon: 'vaccine', title: `${overdueVaccine.petName}'s vaccine is overdue`, note: `Due ${formatDate(overdueVaccine.nextDueDate)}`, color: colors.danger, background: colors.dangerSoft, border: colors.lineStrong, onPress: onRecords };
  }
  if (pendingPets.length) {
    return { icon: 'danger', title: `${pendingPets[0].name} is waiting for clinic review`, note: 'The clinic will update the approval status.', color: colors.warning, background: colors.amberSoft, border: colors.lineStrong, onPress: onPets };
  }
  if (nextAppointment) {
    return { icon: 'appointment', title: `${nextAppointment.petName}'s next visit`, note: formatDateTime(nextAppointment.scheduledDateTime || nextAppointment.requestedDateTime), color: colors.primaryDark, background: colors.primarySoft, border: colors.lineStrong, onPress: onAppointments };
  }
  if (unreadCount) {
    return { icon: 'alerts', title: `${unreadCount} unread clinic alert${unreadCount === 1 ? '' : 's'}`, note: 'Review the latest clinic updates.', color: colors.primaryDark, background: colors.primarySoft, border: colors.lineStrong, onPress: onNotifications };
  }
  if (nextVaccine) {
    return { icon: 'vaccine', title: `${nextVaccine.petName}'s vaccine reminder`, note: `Next due ${formatDate(nextVaccine.nextDueDate)}`, color: colors.success, background: colors.accentSoft, border: colors.lineStrong, onPress: onRecords };
  }
  return { icon: 'check', title: 'Everything is up to date', note: 'No urgent care tasks right now.', color: colors.success, background: colors.accentSoft, border: colors.lineStrong, onPress: onNotifications };
}

function QuickAction({ icon, label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={`Open ${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quick, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}><AppIcon name={icon} color={colors.primaryDark} size={19} /></View>
      <Text style={[styles.quickLabel, { color: colors.ink }]}>{label}</Text>
      <AppIcon name="forward" color={colors.mutedSoft} size={15} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  hero: { minHeight: 98, justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden', borderRadius: spacing.radius },
  heroArt: { left: '50%', right: 'auto', bottom: 'auto', width: '50%', height: 124, top: -12 },
  heroCopy: { zIndex: 1, width: '58%', padding: spacing.lg },
  welcome: { color: '#244A91', fontSize: 13, fontFamily: 'Manrope_700Bold' },
  heroTitle: { color: '#13234F', fontSize: 21, lineHeight: 27, fontFamily: 'Manrope_800ExtraBold', marginTop: 5 },
  heroText: { color: '#304B80', fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_600SemiBold', marginTop: spacing.sm },
  heroTitleNight: { color: '#FFFFFF' },
  heroTextNight: { color: '#DCE7FF' },
  nextCard: { marginBottom: spacing.md },
  bookButton: { marginTop: spacing.md },
  reminderBadge: { marginTop: 6 },
  summaryTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  priority: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  priorityIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  priorityCopy: { flex: 1, minWidth: 0 },
  priorityKicker: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', textTransform: 'uppercase' },
  priorityTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', marginTop: 1 },
  priorityNote: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 1 },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kicker: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  bookLink: { minHeight: 28, justifyContent: 'center', borderRadius: 8, paddingHorizontal: spacing.sm },
  bookLinkText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  nextBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  nextCopy: { flex: 1 },
  nextName: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  nextDate: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 2 },
  nextService: { fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  statTile: { flexBasis: '47%', flexGrow: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  link: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  actionCard: { marginBottom: spacing.lg },
  actionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  actionDetail: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  toolsTitle: { marginBottom: spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quick: { flexBasis: '47%', flexGrow: 1, minHeight: 56, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  quickIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  assistant: { minHeight: 54, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md, elevation: 4 },
  assistantWeb: { boxShadow: '0 4px 14px rgba(35,52,95,0.14)' },
  assistantIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  assistantCopy: { flex: 1 },
  assistantText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_800ExtraBold' },
  assistantNote: { color: '#DBEAFE', fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  pressed: { opacity: 0.75 },
});
