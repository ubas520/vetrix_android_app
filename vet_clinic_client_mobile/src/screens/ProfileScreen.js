import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AppIcon from '../components/AppIcon';
import FormInput from '../components/FormInput';
import ConnectionNotice from '../components/ConnectionNotice';
import { isConnectionError } from '../api/errors';
import StackHeader from '../components/StackHeader';
import { useAuth } from '../context/AuthContext';
import { useClientData } from '../context/ClientDataContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { showAppAlert } from '../utils/appAlert';
import { formatDate } from '../utils/helpers';

export default function ProfileScreen({ navigation }) {
  const { client, logout, updateProfile } = useAuth();
  const { pets, profile: serverProfile } = useClientData();
  const { showToast } = useFeedback();
  const { colors: themeColors } = useTheme();
  const profile = client || serverProfile || {};
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    const nextErrors = validateProfile({ email, name, phone });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const result = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (!result?.ok) {
        throw result?.error || new Error('Your profile could not be updated. Try again.');
      }
      showToast('Your clinic contact details were saved.', { title: 'Profile updated' });
    } catch (saveError) {
      setErrors({ form: saveError });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAppAlert('Logout', 'Do you want to leave the client mobile app?', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <StackHeader navigation={navigation} title="Profile" />

          <View style={[styles.hero, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
            <View style={[styles.avatar, { backgroundColor: themeColors.primarySoft, borderColor: themeColors.lineStrong }]}>
              <AppIcon name="profile" color={themeColors.primaryDark} size={31} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.name, { color: themeColors.ink }]}>{profile.name || 'Client'}</Text>
              <Text style={[styles.meta, { color: themeColors.muted }]}>Vetrix client since {formatDate(profile.memberSince)}</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <AppCard style={styles.stat}>
              <Text style={[styles.statValue, { color: themeColors.ink }]}>{pets.length}</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Registered pets</Text>
            </AppCard>
            <AppCard style={styles.stat}>
              <Text style={[styles.statValue, { color: themeColors.ink }]}>Client</Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Mobile access</Text>
            </AppCard>
          </View>

          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Basic details</Text>
            <Text style={[styles.sectionText, { color: themeColors.muted }]}>Keep your clinic contact information current.</Text>

            <FormInput label="Full name" icon="profile" value={name} onChangeText={(value) => { setName(value); setErrors((current) => ({ ...current, name: '' })); }} error={errors.name} />
            <FormInput
              label="Email"
              icon="mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: '' })); }}
              error={errors.email}
            />
            <FormInput
              label="Phone"
              icon="phone"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => { setPhone(value); setErrors((current) => ({ ...current, phone: '' })); }}
              error={errors.phone}
            />
            <FormInput
              label="Address"
              multiline
              value={address}
              onChangeText={setAddress}
            />
            <ConnectionNotice error={errors.form} onRetry={isConnectionError(errors.form) ? handleSave : undefined} loading={saving} />
            <AppButton title="Save changes" icon="check" loading={saving} onPress={handleSave} style={styles.primaryButton} />

            <Pressable style={[styles.logoutButton, { backgroundColor: themeColors.cream }]} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validateProfile({ email, name, phone }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your full name.';
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  else if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter at least 10 digits.';
  return errors;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: spacing.radius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primarySoft,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  name: { color: colors.ink, fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 21, fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { color: colors.muted, fontSize: 14, fontFamily: 'Manrope_700Bold', marginTop: 2, textAlign: 'center' },
  card: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  sectionText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginBottom: spacing.sm },
  formError: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_700Bold', marginTop: spacing.sm },
  primaryButton: {
    marginTop: spacing.lg,
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.danger, fontFamily: 'Manrope_800ExtraBold' },
});
