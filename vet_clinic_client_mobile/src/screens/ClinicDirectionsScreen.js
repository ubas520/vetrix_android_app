import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppIcon from '../components/AppIcon';
import FormInput from '../components/FormInput';
import StackHeader from '../components/StackHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { clinicLocation } from '../data/clinic';
import { spacing } from '../theme/spacing';
import { showAppAlert } from '../utils/appAlert';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../utils/maps';

const travelModes = [
  { icon: 'car', label: 'Driving', value: 'driving' },
  { icon: 'walking', label: 'Walking', value: 'walking' },
];

export default function ClinicDirectionsScreen({ navigation }) {
  const { client } = useAuth();
  const { colors } = useTheme();
  const [origin, setOrigin] = useState(client?.address || '');
  const [travelMode, setTravelMode] = useState('driving');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [originError, setOriginError] = useState('');
  const [openingMaps, setOpeningMaps] = useState(false);

  const startingPoint = useCurrentLocation ? 'Your current location' : origin.trim() || 'Enter a starting address';

  const openGoogleMaps = async (url) => {
    setOpeningMaps(true);
    try {
      await Linking.openURL(url);
    } catch {
      showAppAlert('Could not open Google Maps', 'Please check your connection and try again.');
    } finally {
      setOpeningMaps(false);
    }
  };

  const handleOpenDirections = () => {
    const trimmedOrigin = origin.trim();
    if (!useCurrentLocation && trimmedOrigin.length < 5) {
      setOriginError('Enter a complete starting address.');
      return;
    }

    setOriginError('');
    const url = buildGoogleMapsDirectionsUrl({
      destination: clinicLocation.mapsQuery,
      origin: trimmedOrigin,
      travelMode,
      useCurrentLocation,
    });
    openGoogleMaps(url);
  };

  const handleOriginChange = (value) => {
    setOrigin(value);
    setOriginError('');
    if (useCurrentLocation) setUseCurrentLocation(false);
  };

  const toggleCurrentLocation = () => {
    setUseCurrentLocation((current) => !current);
    setOriginError('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StackHeader navigation={navigation} title="Clinic directions" />

          <View style={styles.intro}>
            <View style={[styles.introIcon, { backgroundColor: colors.primarySoft }]}>
              <AppIcon name="navigation" color={colors.primaryDark} size={25} />
            </View>
            <View style={styles.introCopy}>
              <Text style={[styles.title, { color: colors.ink }]}>Find the best road to the clinic</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Choose a starting point, then continue in Google Maps for the live route.</Text>
            </View>
          </View>

          <AppCard tone="blue" style={styles.routeCard}>
            <View style={styles.cardHeading}>
              <Text style={[styles.eyebrow, { color: colors.primaryDark }]}>Your trip</Text>
              <View style={[styles.googleBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.googleBadgeText, { color: colors.inkSoft }]}>Google Maps</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeMarkerColumn}>
                <View style={[styles.originMarker, { borderColor: colors.primary, backgroundColor: colors.surface }]} />
                <View style={[styles.routeLine, { borderLeftColor: colors.primaryMuted }]} />
              </View>
              <View style={styles.routeCopy}>
                <Text style={[styles.routeLabel, { color: colors.muted }]}>From</Text>
                <Text numberOfLines={2} style={[styles.routeValue, { color: colors.ink }]}>{startingPoint}</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={[styles.destinationMarker, { backgroundColor: colors.primary }]}>
                <AppIcon name="mapPin" color="#FFFFFF" size={15} strokeWidth={2.3} />
              </View>
              <View style={styles.routeCopy}>
                <Text style={[styles.routeLabel, { color: colors.muted }]}>To</Text>
                <Text style={[styles.routeValue, { color: colors.ink }]}>{clinicLocation.addressLine1}</Text>
                <Text style={[styles.routeDetail, { color: colors.muted }]}>{clinicLocation.addressLine2}</Text>
              </View>
            </View>
          </AppCard>

          <AppCard style={styles.setupCard}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Starting point</Text>
            <Text style={[styles.sectionNote, { color: colors.muted }]}>Your saved profile address is filled in automatically. You can change it for this trip.</Text>

            <FormInput
              autoCapitalize="words"
              editable={!useCurrentLocation}
              error={originError}
              icon="mapPin"
              label="Starting address"
              onChangeText={handleOriginChange}
              onSubmitEditing={handleOpenDirections}
              placeholder="House number, street, city, province"
              returnKeyType="go"
              style={useCurrentLocation ? styles.disabledInput : null}
              value={origin}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: useCurrentLocation }}
              onPress={toggleCurrentLocation}
              style={({ pressed }) => [
                styles.locationChoice,
                {
                  backgroundColor: useCurrentLocation ? colors.accentSoft : colors.surfaceAlt,
                  borderColor: useCurrentLocation ? colors.accent : colors.line,
                },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.locationIcon, { backgroundColor: useCurrentLocation ? colors.surface : colors.primarySoft }]}>
                <AppIcon name="locate" color={useCurrentLocation ? colors.success : colors.primaryDark} size={18} />
              </View>
              <View style={styles.locationCopy}>
                <Text style={[styles.locationTitle, { color: colors.ink }]}>Use my current location</Text>
                <Text style={[styles.locationNote, { color: colors.muted }]}>Google Maps will use your device location as the starting point.</Text>
              </View>
              <View style={[styles.check, { backgroundColor: useCurrentLocation ? colors.accent : colors.surface, borderColor: useCurrentLocation ? colors.accent : colors.lineStrong }]}>
                {useCurrentLocation ? <AppIcon name="check" color="#FFFFFF" size={13} strokeWidth={2.6} /> : null}
              </View>
            </Pressable>

            <Text style={[styles.modeLabel, { color: colors.ink }]}>Travel mode</Text>
            <View style={styles.modes}>
              {travelModes.map((mode) => {
                const selected = travelMode === mode.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={mode.value}
                    onPress={() => setTravelMode(mode.value)}
                    style={({ pressed }) => [
                      styles.mode,
                      { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? colors.primary : colors.line },
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon name={mode.icon} color={selected ? colors.primaryDark : colors.muted} size={18} />
                    <Text style={[styles.modeText, { color: selected ? colors.primaryDark : colors.inkSoft }]}>{mode.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <AppButton
              icon="navigation"
              loading={openingMaps}
              onPress={handleOpenDirections}
              style={styles.primaryButton}
              title="Open suggested route"
            />
          </AppCard>

          <AppCard compact elevated={false} style={styles.destinationCard}>
            <View style={[styles.destinationIcon, { backgroundColor: colors.primarySoft }]}>
              <AppIcon name="mapPin" color={colors.primaryDark} size={21} />
            </View>
            <View style={styles.destinationCopy}>
              <Text style={[styles.destinationTitle, { color: colors.ink }]}>Clinic destination</Text>
              <Text style={[styles.destinationAddress, { color: colors.muted }]}>{clinicLocation.addressLine1}{'\n'}{clinicLocation.addressLine2}</Text>
            </View>
            <Pressable
              accessibilityLabel="View clinic location in Google Maps"
              disabled={openingMaps}
              onPress={() => openGoogleMaps(buildGoogleMapsSearchUrl(clinicLocation.mapsQuery))}
              style={({ pressed }) => [styles.pinButton, { backgroundColor: colors.primarySoft }, pressed && styles.pressed]}>
              <AppIcon name="forward" color={colors.primaryDark} size={17} />
            </Pressable>
          </AppCard>

          <View style={[styles.privacy, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <AppIcon name="petCheck" color={colors.success} size={17} />
            <Text style={[styles.privacyText, { color: colors.muted }]}>Your starting address is shared with Google Maps only after you tap “Open suggested route.”</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  introIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  introCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 21, lineHeight: 27, fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  routeCard: { marginBottom: spacing.md },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  eyebrow: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  googleBadge: { minHeight: 26, borderRadius: 8, justifyContent: 'center', paddingHorizontal: spacing.sm },
  googleBadgeText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  routeRow: { minHeight: 48, flexDirection: 'row', gap: spacing.md },
  routeMarkerColumn: { width: 28, alignItems: 'center' },
  originMarker: { width: 13, height: 13, borderRadius: 7, borderWidth: 4 },
  routeLine: { flex: 1, borderLeftWidth: 2, borderStyle: 'dashed', marginVertical: 4 },
  destinationMarker: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  routeCopy: { flex: 1, minWidth: 0, paddingBottom: spacing.md },
  routeLabel: { fontSize: 12, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase' },
  routeValue: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_800ExtraBold', marginTop: 2 },
  routeDetail: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 1 },
  setupCard: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  sectionNote: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, marginBottom: spacing.md },
  disabledInput: { opacity: 0.56 },
  locationChoice: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 11, padding: spacing.sm, marginTop: spacing.sm },
  locationIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, minWidth: 0 },
  locationTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  locationNote: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  check: { width: 20, height: 20, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modeLabel: { fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: spacing.lg, marginBottom: spacing.sm },
  modes: { flexDirection: 'row', gap: spacing.sm },
  mode: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10 },
  modeText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  primaryButton: { marginTop: spacing.lg },
  destinationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  destinationIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  destinationCopy: { flex: 1, minWidth: 0 },
  destinationTitle: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  destinationAddress: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  pinButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: 11, padding: spacing.md },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium' },
  pressed: { opacity: 0.72 },
});
