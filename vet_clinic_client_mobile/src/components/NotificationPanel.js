import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { spacing } from '../theme/spacing';
import { formatDateTime } from '../utils/helpers';
import AppIcon from './AppIcon';
import EmptyState from './EmptyState';

export default function NotificationPanel({ visible, onClose }) {
  const { markAllAsRead, markAsRead, notifications, unreadCount } = useNotifications();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const refreshControl = useClientRefreshControl();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 64, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable accessibilityLabel="Dismiss notifications" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <View accessibilityViewIsModal style={[
          styles.panel,
          { backgroundColor: colors.surface, borderColor: colors.line },
          Platform.OS === 'web'
            ? styles.webShadow
            : { shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
        ]}>
          <View style={styles.head}>
            <View style={styles.headCopy}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>Notifications</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{unreadCount ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}` : "You're all caught up"}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" onPress={onClose} style={({ pressed }) => [styles.close, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}><AppIcon name="close" color={colors.inkSoft} size={20} /></Pressable>
          </View>
          {unreadCount > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" onPress={markAllAsRead} style={({ pressed }) => [styles.readAll, { backgroundColor: colors.primarySoft }, pressed && styles.pressed]}>
              <AppIcon name="check" color={colors.primaryDark} size={17} />
              <Text style={[styles.readAllText, { color: colors.primaryDark }]}>Mark all as read</Text>
            </Pressable>
          ) : null}

          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<EmptyState title="No alerts" message="Clinic updates and reminders appear here." icon="alerts" />}
            refreshControl={refreshControl}
            renderItem={({ item }) => {
              const unread = item.status === 'Unread';
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.message}`}
                  onPress={() => markAsRead(item.id)}
                  style={({ pressed }) => [styles.item, { borderTopColor: colors.lineNeutral, backgroundColor: unread ? colors.primarySoft : 'transparent' }, pressed && styles.pressed]}>
                  <View style={[styles.itemIcon, { backgroundColor: unread ? colors.surface : colors.surfaceAlt }]}><AppIcon name={getNotificationIcon(item.type)} color={colors.primaryDark} size={19} /></View>
                  <View style={styles.itemCopy}>
                    <View style={styles.itemTitleRow}><Text style={[styles.itemTitle, { color: colors.ink }]}>{item.title}</Text>{unread ? <View style={[styles.newDot, { backgroundColor: colors.primary }]} /> : null}</View>
                    <Text style={[styles.itemText, { color: colors.muted }]}>{item.message}</Text>
                    <Text style={[styles.itemDate, { color: colors.muted }]}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function getNotificationIcon(type) {
  if (type === 'Appointment') return 'appointment';
  if (type === 'Pet') return 'pets';
  if (type === 'Record') return 'records';
  if (type === 'Vaccine') return 'vaccine';
  return 'alerts';
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'flex-end', paddingHorizontal: spacing.md },
  panel: { width: '100%', maxWidth: 420, flexShrink: 1, borderRadius: spacing.radius, borderWidth: 1, padding: spacing.md, elevation: 8 },
  webShadow: { boxShadow: '0 8px 24px rgba(17,26,58,0.16)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, headCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 28, fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  readAll: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 10, paddingHorizontal: spacing.sm, marginBottom: spacing.sm }, readAllText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  close: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { gap: spacing.xs },
  item: { minHeight: 78, flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderRadius: 10, padding: spacing.sm },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, itemCopy: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, itemTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_800ExtraBold' }, newDot: { width: 7, height: 7, borderRadius: 4 },
  itemText: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_500Medium', marginTop: 4 }, itemDate: { fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_600SemiBold', marginTop: spacing.xs }, pressed: { opacity: 0.72 },
});
