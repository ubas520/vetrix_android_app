import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createProductOrder } from '../api/clientApi';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import CartQuantity from '../components/CartQuantity';
import EmptyState from '../components/EmptyState';
import FormInput from '../components/FormInput';
import StackHeader from '../components/StackHeader';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { canBuy, money, checkoutRequestKey } from '../utils/shop';

export default function ProductCheckoutScreen({ navigation }) {
  const { colors } = useTheme();
  const { products, cart, updateCart, clearCart, paymentOptions, rememberOrder, refresh, refreshOrders } = useClientData();
  const [method, setMethod] = useState('clinic');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState('');
  const paymentRequest = useRef(0);
  const refreshPaymentMethods = useCallback(async () => {
    const requestId = ++paymentRequest.current;
    setPaymentLoading(true);
    setPaymentError('');
    try {
      await refreshOrders();
    } catch (loadError) {
      if (requestId === paymentRequest.current) setPaymentError(loadError.message || 'Payment methods could not be updated. Please try again.');
    } finally {
      if (requestId === paymentRequest.current) setPaymentLoading(false);
    }
  }, [refreshOrders]);
  useFocusEffect(useCallback(() => {
    void refreshPaymentMethods();
    return () => { paymentRequest.current += 1; };
  }, [refreshPaymentMethods]));
  const submitting = useRef(false);
  const attempt = useRef(null);
  const lines = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((p) => String(p.id) === id), id, quantity }));
  const total = lines.reduce((sum, line) => sum + Math.round((line.product?.price || 0) * 100) * line.quantity, 0) / 100;
  const invalid = lines.some(({ product, quantity }) => !canBuy(product) || quantity > product.stockQty);
  const gcash = paymentOptions.gcash || {};
  const accounts = (paymentOptions.accounts || []).filter((account) => account.enabled !== false && account.enabled !== 0 && account.enabled !== '0');
  const selected = accounts.find((account) => `account:${account.id}` === method);
  const choices = [
    ['clinic', 'Pay at the clinic', 'Pay when collecting your products.'],
    ...accounts.map((account) => [`account:${account.id}`, account.provider, `${account.account_name} · ${account.account_number}${account.qr_url ? ' · QR available' : ''}`]),
    ...(gcash.enabled && !accounts.some((a) => a.method === 'gcash') ? [['gcash', 'GCash', `${gcash.account_name} · ${gcash.account_number}`]] : []),
  ];
  const paymentUnavailable = !choices.some(([value]) => value === method);

  async function placeOrder() {
    if (submitting.current) return;
    if (!uncertain && (paymentLoading || paymentError || invalid || paymentUnavailable)) return;
    submitting.current = true; setBusy(true); setError('');
    if (!attempt.current) attempt.current = {
      request_key: checkoutRequestKey(),
      payment_method: selected?.method || method, notes,
      ...(selected ? { payment_account_id: selected.id } : {}),
      items: lines.map(({ product, quantity }) => ({ product_id: product.id, quantity, unit_price_centavos: Math.round(product.price * 100) })),
    };
    try {
      const response = await createProductOrder(attempt.current);
      const order = response.data?.order;
      if (!order) throw new Error('Order confirmation was not received. Retry to check this same order.');
      rememberOrder(order); clearCart();
      void refresh();
      navigation.replace('ProductOrderDetails', { orderId: order.id, initialOrder: order });
    } catch (e) {
      const ambiguous = !e.status || e.status >= 500;
      setUncertain(ambiguous);
      if (!ambiguous) { attempt.current = null; if (e.status === 409) void refresh(); }
      setError(ambiguous ? `${e.message} Your order may have been received. Retry below to check the same order, or open My orders.` : e.message);
    } finally { submitting.current = false; setBusy(false); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <StackHeader navigation={navigation} title="Your cart" />
    <AppButton title="My orders" variant="outline" onPress={() => navigation.navigate('ProductOrders')} />
    {!lines.length ? <EmptyState title="Your cart is empty" message="Add products from the clinic shop to get started." icon="store" /> : <>
      <Text style={[styles.title, { color: colors.ink }]}>Review your order</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>Collect at the clinic. No delivery charge. Stock and prices are checked when you place your order.</Text>
      {lines.map(({ product, id, quantity }) => <AppCard key={id} style={styles.card}>
        <Text style={[styles.name, { color: colors.ink }]}>{product?.name || 'Unavailable product'}</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>{money(product?.price)} each · {money((product?.price || 0) * quantity)}</Text>
        <CartQuantity name={product?.name || 'product'} quantity={quantity} max={canBuy(product) ? Math.min(99, product.stockQty) : 0} onChange={(value) => updateCart(id, value)} disabled={busy || uncertain} />
        {!canBuy(product) || quantity > product.stockQty ? <Text style={{ color: colors.danger }}>Update or remove this item; the requested stock is unavailable.</Text> : null}
      </AppCard>)}
      <Text style={[styles.title, { color: colors.ink }]}>How would you like to pay?</Text>
      <AppButton title={paymentLoading ? 'Updating payment methods...' : 'Refresh payment methods'} variant="outline" loading={paymentLoading} disabled={busy || uncertain || paymentLoading} onPress={refreshPaymentMethods} />
      {paymentError ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.danger }]}>Could not update payment methods. {paymentError} Tap Refresh payment methods to try again.</Text> : null}
      {choices.map(([value, title, subtitle]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: method === value, disabled: busy || uncertain || paymentUnavailable && method === value }} disabled={busy || uncertain || paymentUnavailable && method === value} onPress={() => setMethod(value)} style={[styles.option, { backgroundColor: method === value ? colors.primarySoft : colors.surface, borderColor: method === value ? colors.primary : colors.line }]}><Text style={[styles.name, { color: colors.ink }]}>{method === value ? '● ' : '○ '}{title}</Text><Text style={[styles.copy, { color: colors.muted }]}>{subtitle}</Text></Pressable>)}
      {!paymentLoading && !paymentError && choices.length === 1 ? <Text style={[styles.copy, { color: colors.muted }]}>The clinic has not enabled online transfers yet. You can pay at pickup.</Text> : null}
      {paymentUnavailable ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>This account is no longer available. Choose another payment option.</Text> : null}
      <FormInput label="Order note (optional)" placeholder="Anything staff should know for pickup?" value={notes} onChangeText={setNotes} maxLength={500} multiline editable={!busy && !uncertain} />
      <Text style={[styles.title, { color: colors.primaryDark }]}>Total {money(total)}</Text>
      {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.danger }]}>{error}</Text> : null}
      <AppButton title={uncertain ? 'Retry order confirmation' : `Place order · ${money(total)}`} onPress={placeOrder} loading={busy} disabled={!uncertain && (invalid || paymentUnavailable || paymentLoading || !!paymentError)} />
    </>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { padding: spacing.screen, paddingTop: 0, paddingBottom: 40, gap: 12 }, title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 20, marginTop: 12 }, name: { fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }, copy: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 20 }, card: { gap: 10 }, option: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 } });
