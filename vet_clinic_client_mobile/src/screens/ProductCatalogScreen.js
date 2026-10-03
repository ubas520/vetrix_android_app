import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import CartQuantity from '../components/CartQuantity';
import { canBuy } from '../utils/shop';
import AppIcon from '../components/AppIcon';
import EmptyState from '../components/EmptyState';
import FormInput from '../components/FormInput';
import { ProductCardSkeleton } from '../components/Skeleton';
import StackHeader from '../components/StackHeader';
import StatusBadge from '../components/StatusBadge';
import { useClientData } from '../context/ClientDataContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { spacing } from '../theme/spacing';

const availabilityOrder = { available: 0, low_stock: 1, out_of_stock: 2 };

function formatPrice(product) {
  if (!Number.isFinite(product.price) || product.price <= 0) return 'Ask clinic';
  return `₱${product.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAvailability(status) {
  return {
    available: 'In stock',
    low_stock: 'Limited stock',
    out_of_stock: 'Out of stock',
  }[status] || 'Ask clinic';
}

function getProductIcon(category) {
  const normalized = String(category || '').toLowerCase();
  if (normalized.includes('vaccine')) return 'vaccine';
  if (normalized.includes('groom')) return 'grooming';
  return 'product';
}

export default function ProductCatalogScreen({ navigation }) {
  const { colors } = useTheme();
  const { loading, products, cart, updateCart } = useClientData();
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const refreshControl = useClientRefreshControl();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const activeProducts = useMemo(
    () => products
      .filter((product) => product.status !== 'inactive')
      .sort((a, b) => (availabilityOrder[a.status] ?? 9) - (availabilityOrder[b.status] ?? 9)
        || a.category.localeCompare(b.category)
        || a.name.localeCompare(b.name)),
    [products],
  );

  const categories = useMemo(
    () => ['All', ...new Set(activeProducts.map((product) => product.category || 'Uncategorized'))],
    [activeProducts],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const searchableText = `${product.name} ${product.category || ''} ${product.sku || ''}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [activeProducts, category, query]);

  const resultLabel = `${visibleProducts.length} product${visibleProducts.length === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <StackHeader navigation={navigation} title="Clinic products" />

        <AppCard tone="blue" style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
            <AppIcon name="store" color={colors.primaryDark} size={26} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroKicker, { color: colors.primaryDark }]}>Clinic shop</Text>
            <Text style={[styles.heroTitle, { color: colors.ink }]}>Products for your pet</Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>Shop clinic products and collect your order at Vetrix.</Text>
          </View>
        </AppCard>

        <View style={[styles.purchaseNote, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
          <View style={[styles.purchaseIcon, { backgroundColor: colors.surface }]}>
            <AppIcon name="petCheck" color={colors.success} size={17} />
          </View>
          <Text style={[styles.purchaseText, { color: colors.inkSoft }]}>Choose GCash or bank transfer with staff verification, or pay at the clinic on pickup.</Text>
        </View>
        <View style={{ gap: 8, marginBottom: spacing.md }}>
          <AppButton title={`View cart (${cartCount})`} onPress={() => navigation.navigate('ProductCheckout')} variant={cartCount ? 'primary' : 'outline'} />
          <AppButton title="My orders" onPress={() => navigation.navigate('ProductOrders')} variant="outline" />
        </View>

        <FormInput
          accessibilityLabel="Search products"
          autoCapitalize="none"
          autoCorrect={false}
          icon="search"
          onChangeText={setQuery}
          placeholder="Search product or category"
          returnKeyType="search"
          value={query}
        />

        <ScrollView
          contentContainerStyle={styles.categories}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}>
          {categories.map((item) => {
            const selected = item === category;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setCategory(item)}
                style={({ pressed }) => [
                  styles.category,
                  { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.categoryText, { color: selected ? '#FFFFFF' : colors.inkSoft }]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.resultsHead}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Available at Vetrix</Text>
            <Text accessibilityLiveRegion="polite" style={[styles.resultCount, { color: colors.muted }]}>{loading ? 'Loading products…' : resultLabel}</Text>
          </View>
          <View style={[styles.readOnlyBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <AppIcon name="store" color={colors.muted} size={13} />
            <Text style={[styles.readOnlyText, { color: colors.muted }]}>Clinic pickup</Text>
          </View>
        </View>

        {loading ? (
          <View>
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </View>
        ) : visibleProducts.length ? (
          visibleProducts.map((product, index) => <ProductCard delay={index * 45} key={product.id} product={product} quantity={cart[product.id] || 0} onChange={(quantity) => updateCart(product.id, quantity)} />)
        ) : (
          <EmptyState
            icon="product"
            message={query.trim() ? `No products match “${query.trim()}”. Try another name or category.` : 'No client-visible products are listed in this category.'}
            title="No products found"
          />
        )}

        <Text style={[styles.disclaimer, { color: colors.muted }]}>Prices are shown in Philippine pesos. Vaccines and medical products require clinic guidance and may involve separate professional services.</Text>
      </ScrollView>
      {cartCount > 0 ? <View style={{ padding: spacing.md, backgroundColor: colors.surface }}><AppButton title={`Review cart · ${cartCount} item${cartCount === 1 ? '' : 's'}`} onPress={() => navigation.navigate('ProductCheckout')} /></View> : null}
    </SafeAreaView>
  );
}

function ProductCard({ delay, product, quantity, onChange }) {
  const { colors } = useTheme();
  const isVaccine = String(product.category || '').toLowerCase().includes('vaccine');
  const iconBackground = isVaccine ? colors.lavender : colors.mint;
  const availability = getAvailability(product.status);

  return (
    <AppCard compact delay={delay} reveal style={styles.productCard}>
      <View style={[styles.productVisual, { backgroundColor: iconBackground }]}>
        <AppIcon name={getProductIcon(product.category)} color={colors.primaryDark} size={27} />
      </View>
      <View style={styles.productCopy}>
        <View style={styles.productTop}>
          <Text numberOfLines={1} style={[styles.productCategory, { color: colors.muted }]}>{product.category || 'Uncategorized'}</Text>
          <StatusBadge compact status={availability} />
        </View>
        <Text numberOfLines={2} style={[styles.productName, { color: colors.ink }]}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primaryDark }]}>{formatPrice(product)}</Text>
          {product.price > 0 ? <Text style={[styles.unit, { color: colors.muted }]}>per {product.unit || 'item'}</Text> : null}
        </View>
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          {quantity ? <CartQuantity name={product.name} quantity={quantity} max={canBuy(product) ? Math.min(99, product.stockQty) : 0} onChange={onChange} /> : <AppButton compact title={canBuy(product) ? 'Add to cart' : 'Unavailable'} disabled={!canBuy(product)} onPress={() => onChange(1)} />}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  heroIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroKicker: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTitle: { fontSize: 18, lineHeight: 23, fontFamily: 'Manrope_800ExtraBold', marginTop: 2 },
  heroText: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 3 },
  purchaseNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.md },
  purchaseIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  purchaseText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_600SemiBold' },
  categoryScroll: { marginHorizontal: -spacing.screen, marginTop: spacing.sm, marginBottom: spacing.lg },
  categories: { gap: 6, paddingHorizontal: spacing.screen },
  category: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md },
  categoryText: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  resultCount: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  readOnlyBadge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: spacing.sm },
  readOnlyText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  productCard: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  productVisual: { width: 66, height: 66, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, minWidth: 0 },
  productTop: { minHeight: 23, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  productCategory: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase' },
  productName: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_800ExtraBold', marginTop: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: spacing.xs },
  price: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  unit: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  disclaimer: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.72 },
});
