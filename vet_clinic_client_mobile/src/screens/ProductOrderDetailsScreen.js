import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Image, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildWebsiteUrl } from '../api/config';
import { cancelProductOrder, submitOrderProof } from '../api/clientApi';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import FormInput from '../components/FormInput';
import StackHeader from '../components/StackHeader';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { showAppAlert } from '../utils/appAlert';
import { money, orderStatus, paymentStatus } from '../utils/shop';

export default function ProductOrderDetailsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { orders, refreshOrders, rememberOrder, refresh } = useClientData();
  const [asset, setAsset] = useState(null);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const order = orders.find((item) => String(item.id) === String(route.params.orderId)) || route.params.initialOrder;
  const load = useCallback(async () => { try { await refreshOrders(); } catch (e) { setError(e.message); } }, [refreshOrders]);
  useFocusEffect(useCallback(() => { void load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]));

  async function pickProof() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (selected.fileSize > 5 * 1024 * 1024) throw new Error('Choose a screenshot smaller than 5 MB.');
      if (selected.mimeType && !['image/jpeg', 'image/png'].includes(selected.mimeType)) throw new Error('Choose a JPEG or PNG screenshot.');
      setAsset(selected); setError('');
    } catch (e) { setError(e.message); }
  }
  async function mutate(action) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = action === 'proof' ? await submitOrderProof(order.id, reference, asset) : await cancelProductOrder(order.id);
      rememberOrder(result.data.order);
      setNotice(action === 'proof' ? 'Payment proof sent. Staff will verify your transfer before marking it paid.' : 'Order cancelled.');
      setAsset(null); void refresh();
    } catch (e) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  const open = order && ['placed', 'ready'].includes(order.status);
  const acceptsProof = open && ['gcash', 'bank'].includes(order.payment_method) && ['pending', 'rejected'].includes(order.payment_status);
  const recipient = order?.payment_recipient;
  const provider = recipient?.provider || (order?.payment_method === 'bank' ? 'Bank transfer' : 'GCash');
  const validReference = (order?.payment_method === 'bank' ? /^[A-Za-z0-9]{6,40}$/ : /^\d{10,20}$/).test(reference.replace(/[\s-]/g, ''));
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
    <StackHeader navigation={navigation} title={order ? `Order #${order.id}` : 'Order details'} />
    {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.danger }]}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.primaryDark }]}>{notice}</Text> : null}
    {order ? <>
      <AppCard style={styles.card}><Text style={[styles.title, { color: colors.ink }]}>{orderStatus(order)}</Text><Text style={[styles.name, { color: colors.primaryDark }]}>{paymentStatus(order)}</Text><Text style={[styles.copy, { color: colors.muted }]}>Clinic pickup · {order.payment_method === 'clinic' ? 'Pay at the clinic' : provider}{ '\n' }{order.created_at}</Text>
        {order.items.map((item) => <Text key={item.item_id} style={[styles.copy, { color: colors.ink }]}>{item.quantity} × {item.item_name} · {money(item.line_total)}</Text>)}
        <Text style={[styles.title, { color: colors.ink }]}>Total {money(order.total_amount)}</Text>
        {order.notes ? <Text style={[styles.copy, { color: colors.muted }]}>Your note: {order.notes}</Text> : null}
        {order.staff_note ? <Text style={[styles.copy, { color: colors.ink }]}>Staff note: {order.staff_note}</Text> : null}
      </AppCard>
      {acceptsProof ? <AppCard style={styles.card}>
        <Text style={[styles.title, { color: colors.ink }]}>Pay with {provider}</Text>
        <Text selectable style={[styles.name, { color: colors.primaryDark }]}>{recipient?.account_name || order.gcash_name}{ '\n' }{recipient?.account_number || order.gcash_number}</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>Send exactly {money(order.total_amount)} to this account using your wallet or banking app, then attach the payment screenshot and reference number here. Payment stays unverified until staff checks the transfer.</Text>
        {order.payment_status === 'rejected' ? <Text style={[styles.copy, { color: colors.danger }]}>Contact the clinic if money was deducted. Do not send payment twice. Staff can explain what needs correcting.</Text> : null}
        {recipient?.qr_url ? <>
          <Image source={{ uri: buildWebsiteUrl(recipient.qr_url) }} accessibilityLabel={provider + ' receiving QR code'} resizeMode="contain" style={{ width: '100%', height: 280, backgroundColor: '#FFFFFF' }} />
          <AppButton title="Open QR image" variant="outline" onPress={() => Linking.openURL(buildWebsiteUrl(recipient.qr_url)).catch(() => setError('Could not open the QR image. Use the account details above.'))} />
          <Text style={[styles.copy, { color: colors.muted }]}>Open and save the QR image, then import it in your payment app if supported. Check the recipient and amount before confirming.</Text>
        </> : null}
        <FormInput label="Payment reference number" placeholder={order.payment_method === 'bank' ? 'Bank transfer reference' : '10–20 digit reference'} value={reference} onChangeText={setReference} keyboardType={order.payment_method === 'bank' ? 'default' : 'number-pad'} maxLength={50} editable={!busy} />
        <AppButton title={asset ? 'Change screenshot' : 'Choose payment screenshot'} variant="outline" onPress={pickProof} disabled={busy} />
        {asset ? <Image source={{ uri: asset.uri }} accessibilityLabel="Selected payment screenshot" resizeMode="contain" style={{ width: '100%', height: 240 }} /> : null}
        <AppButton title="Submit payment proof" onPress={() => mutate('proof')} disabled={!asset || !validReference} loading={busy} />
      </AppCard> : null}
      {order.proof ? <Text style={[styles.copy, { color: colors.muted }]}>Submitted reference: {order.proof.reference}{ '\n' }{order.proof.review_note || 'Your payment proof is saved with this order.'}</Text> : null}
      {open && ['pending', 'rejected'].includes(order.payment_status) ? <AppButton title="Cancel order" variant="danger" disabled={busy} onPress={() => showAppAlert('Cancel order?', 'This releases your reserved products. If you already sent payment, contact staff before cancelling.', [{ text: 'Keep order', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => mutate('cancel') }])} /> : null}
    </> : <Text style={[styles.copy, { color: colors.muted }]}>Loading order details. Pull down to retry.</Text>}
    <AppButton title="All my orders" variant="outline" onPress={() => navigation.navigate('ProductOrders')} />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { paddingHorizontal: spacing.screen, paddingBottom: 40, gap: 12 }, card: { gap: 12 }, title: { fontSize: 19, fontFamily: 'Manrope_800ExtraBold' }, name: { fontSize: 15, lineHeight: 23, fontFamily: 'Manrope_800ExtraBold' }, copy: { fontSize: 13, lineHeight: 21, fontFamily: 'Manrope_500Medium' } });
