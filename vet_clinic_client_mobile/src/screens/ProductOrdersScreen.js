import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import EmptyState from '../components/EmptyState';
import StackHeader from '../components/StackHeader';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { money, orderStatus, paymentStatus } from '../utils/shop';

export default function ProductOrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const { orders, refreshOrders } = useClientData();
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { await refreshOrders(); setError(''); } catch (e) { setError(e.message); }
    finally { setRefreshing(false); }
  }, [refreshOrders]);
  useFocusEffect(useCallback(() => { void load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]));
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    <StackHeader navigation={navigation} title="My orders" />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
    {!orders.length ? <EmptyState title={refreshing ? 'Loading orders' : 'No orders yet'} message="Your clinic product purchases and pickup updates will appear here." icon="store" /> : null}
    {[...orders].sort((a, b) => b.id - a.id).map((order) => <AppCard key={order.id} style={styles.card}>
      <Text style={[styles.title, { color: colors.ink }]}>Order #{order.id} · {money(order.total_amount)}</Text>
      <Text style={[styles.copy, { color: colors.primaryDark }]}>{orderStatus(order)} · {paymentStatus(order)}</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>{order.items.map((item) => `${item.quantity} × ${item.item_name}`).join('\n')}</Text>
      <AppButton title={`View order #${order.id}`} variant="outline" onPress={() => navigation.navigate('ProductOrderDetails', { orderId: order.id })} />
    </AppCard>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { paddingHorizontal: spacing.screen, paddingBottom: 40, gap: 12 }, card: { gap: 10 }, title: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' }, copy: { fontSize: 13, lineHeight: 20, fontFamily: 'Manrope_600SemiBold' } });
