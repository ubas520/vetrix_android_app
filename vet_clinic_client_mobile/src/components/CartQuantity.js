import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CartQuantity({ name, quantity, max, onChange, disabled }) {
  const { colors } = useTheme();
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${name}`} disabled={disabled || quantity < 1} onPress={() => onChange(quantity - 1)} style={[styles.button, { backgroundColor: colors.surfaceAlt }]}><Text style={{ color: colors.ink }}>−</Text></Pressable>
    <Text accessibilityLabel={`${quantity} in cart`} style={[styles.quantity, { color: colors.ink }]}>{quantity}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${name}`} disabled={disabled || quantity >= max} onPress={() => onChange(quantity + 1)} style={[styles.button, { backgroundColor: colors.primarySoft, opacity: quantity >= max ? 0.4 : 1 }]}><Text style={{ color: colors.primaryDark }}>+</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, button: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, quantity: { fontFamily: 'Manrope_800ExtraBold', fontSize: 14 } });
