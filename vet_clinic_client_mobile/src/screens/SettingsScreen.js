import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appImages } from '../assets/images';
import AppCard from '../components/AppCard';
import AppIcon from '../components/AppIcon';
import NotificationPanel from '../components/NotificationPanel';
import StackHeader from '../components/StackHeader';
import ThemedArtwork from '../components/ThemedArtwork';
import { useAuth } from '../context/AuthContext';
import { useClientData } from '../context/ClientDataContext';
import { useFeedback } from '../context/FeedbackContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { showAppAlert } from '../utils/appAlert';

export default function SettingsScreen({ navigation }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [clinicNotifications, setClinicNotifications] = useState(true);
  const [petReminders, setPetReminders] = useState(true);
  const { client, logout } = useAuth();
  const { appointments, pets, profile: serverProfile } = useClientData();
  const { showToast } = useFeedback();
  const { markAllAsRead, unreadCount } = useNotifications();
  const { colors, isNightMode, setNightMode } = useTheme();
  const profile = client || serverProfile || {};
  const approvedPets = pets.filter((pet) => pet.status === 'Approved').length;
  const pendingAppointments = appointments.filter((item) => item.status === 'Pending').length;

  const handleLogout = () => {
    showAppAlert('Logout', 'Do you want to leave the client mobile app?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) {
      showToast('There were no unread alerts.', { title: 'Alerts updated' });
      return;
    }

    const updated = await markAllAsRead();
    showToast(
      updated ? 'All clinic alerts are now marked as read.' : 'Vetrix could not update the alerts. Try again.',
      { title: updated ? 'Alerts updated' : 'Update failed' },
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <StackHeader navigation={navigation} title="Settings" />
        <View style={styles.intro}>
          <View style={styles.introCopy}><Text style={[styles.title, { color: colors.ink }]}>Settings</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Manage your account and app preferences.</Text></View>
          <ThemedArtwork source={appImages.settings} style={styles.art} />
        </View>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Account</Text>
          <InfoRow label="Name" value={profile.name || 'Client'} />
          <InfoRow label="Email" value={profile.email || 'Not set'} />
          <InfoRow label="Phone" value={profile.phone || 'Not set'} />
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Preferences</Text>
          <PreferenceRow icon="night" label="Night Mode" note="Use darker colors in the app" value={isNightMode} onValueChange={setNightMode} />
          <PreferenceRow icon="alerts" label="Clinic Notifications" note={`${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`} value={clinicNotifications} onValueChange={setClinicNotifications} />
          <PreferenceRow icon="appointment" label="Pet Reminders" note={`${approvedPets} approved pet${approvedPets === 1 ? '' : 's'}, ${pendingAppointments} pending visit${pendingAppointments === 1 ? '' : 's'}`} value={petReminders} onValueChange={setPetReminders} />
        </AppCard>

        <View style={styles.actions}>
          <Action icon="profile" title="Edit Profile" onPress={() => navigation.navigate('Profile')} />
          <Action icon="alerts" title="Mark Alerts Read" onPress={handleMarkAllRead} />
          <Action icon="records" title="Medical Records" onPress={() => navigation.navigate('ClientTabs', { screen: 'Records' })} />
        </View>

        <Pressable onPress={handleLogout} style={[styles.logout, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppIcon name="logout" color={colors.danger} size={18} /><Text style={[styles.logoutText, { color: colors.danger }]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  const { colors } = useTheme();
  return <View style={[styles.infoRow, { borderTopColor: colors.lineNeutral }]}><Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.ink }]}>{value}</Text></View>;
}

function PreferenceRow({ icon, label, note, value, onValueChange }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.preference, { borderTopColor: colors.lineNeutral }]}>
      <View style={[styles.preferenceIcon, { backgroundColor: colors.primarySoft }]}><AppIcon name={icon} color={colors.primaryDark} size={18} /></View>
      <View style={styles.preferenceCopy}><Text style={[styles.preferenceLabel, { color: colors.ink }]}>{label}</Text><Text style={[styles.preferenceNote, { color: colors.muted }]}>{note}</Text></View>
      <Switch trackColor={{ false: colors.lineStrong, true: colors.primaryMuted }} thumbColor={value ? colors.primary : colors.surface} value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Action({ icon, title, onPress }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}><AppIcon name={icon} color={colors.primaryDark} size={19} /><Text style={[styles.actionText, { color: colors.ink }]}>{title}</Text><AppIcon name="forward" color={colors.mutedSoft} size={17} /></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  intro: { minHeight: 124, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }, introCopy: { flex: 1 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Manrope_800ExtraBold' }, subtitle: { maxWidth: 180, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: spacing.sm },
  art: { width: 116, height: 116, borderRadius: 20 }, card: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.xs },
  infoRow: { borderTopWidth: 1, paddingVertical: spacing.sm }, infoLabel: { fontSize: 12, fontFamily: 'Manrope_700Bold' }, infoValue: { fontSize: 12, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  preference: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingVertical: spacing.sm },
  preferenceIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, preferenceCopy: { flex: 1 },
  preferenceLabel: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }, preferenceNote: { fontSize: 12, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  actions: { gap: spacing.sm, marginBottom: spacing.md }, action: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 11, paddingHorizontal: spacing.md }, actionText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 11, paddingHorizontal: spacing.md }, logoutText: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }, pressed: { opacity: 0.72 },
});
