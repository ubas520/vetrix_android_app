import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import AppIcon from '../components/AppIcon';
import HeaderBar from '../components/HeaderBar';
import NotificationPanel from '../components/NotificationPanel';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function MoreScreen({ navigation }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const openStackRoute = (routeName) => navigation.getParent()?.navigate(routeName);

  const tools = [
    { icon: 'qr', title: 'QR Pet Retrieval', note: 'Approved pet access token', route: 'QR', tone: 'mint' },
    { icon: 'settings', title: 'Settings', note: 'Appearance and reminders', route: 'Settings', tone: 'blue' },
    { icon: 'profile', title: 'Profile', note: 'Client contact details', route: 'Profile', tone: 'peach' },
    { icon: 'store', title: 'Clinic Products', note: 'Shop products for clinic pickup', route: 'ProductCatalog', tone: 'lavender' },
    { icon: 'product', title: 'My Orders', note: 'Payments and pickup updates', route: 'ProductOrders', tone: 'mint' },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <HeaderBar onOpenNotifications={() => setPanelOpen(true)} />
        <Text style={[styles.title, { color: colors.ink }]}>More</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Account tools and helpful shortcuts.</Text>

        <View style={styles.grid}>
          {tools.map((tool) => <ToolCard key={tool.route} {...tool} onPress={() => openStackRoute(tool.route)} />)}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Updates</Text>
        <AppCard compact>
          <Pressable onPress={() => setPanelOpen(true)} style={styles.notificationRow}>
            <View style={[styles.notificationIcon, { backgroundColor: colors.primarySoft }]}><AppIcon name="alerts" color={colors.primaryDark} size={20} /></View>
            <View style={styles.notificationCopy}><Text style={[styles.rowTitle, { color: colors.ink }]}>Notifications</Text><Text style={[styles.rowNote, { color: colors.muted }]}>{unreadCount} unread alert{unreadCount === 1 ? '' : 's'}</Text></View>
            <AppIcon name="forward" color={colors.mutedSoft} size={18} />
          </Pressable>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolCard({ icon, title, note, tone, onPress }) {
  const { colors } = useTheme();
  const tones = { mint: colors.mint, blue: colors.primarySoft, peach: colors.peach, lavender: colors.lavender };
  return (
    <Pressable
      accessibilityLabel={`${title}. ${note}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.pressed]}
    >
      <View style={[styles.toolIcon, { backgroundColor: tones[tone] }]}><AppIcon name={icon} color={colors.primaryDark} size={23} /></View>
      <Text style={[styles.toolTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.toolNote, { color: colors.muted }]}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, container: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Manrope_800ExtraBold' }, subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tool: { flexBasis: '47%', flexGrow: 1, minHeight: 144, borderRadius: 14, borderWidth: 1, padding: spacing.md },
  toolIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.md },
  toolNote: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.xl, marginBottom: spacing.sm },
  notificationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notificationIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1 }, rowTitle: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' }, rowNote: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 }, pressed: { opacity: 0.74 },
});
