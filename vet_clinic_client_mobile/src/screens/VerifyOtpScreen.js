import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getScreenFieldErrors, isConnectionError } from '../api/errors';
import AppIcon from '../components/AppIcon';
import FormInput from '../components/FormInput';
import ConnectionNotice from '../components/ConnectionNotice';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function VerifyOtpScreen({ navigation, route }) {
  const { verifyOtp } = useAuth();
  const { showToast } = useFeedback();
  const { colors } = useTheme();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVerification = async () => {
    if (submitting) return;

    const nextErrors = validateVerification(email, otp);
    setErrors(nextErrors);
    setGeneralError('');
    if (Object.keys(nextErrors).length) return;

    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    try {
      const result = await verifyOtp({ email: normalizedEmail, otp: otp.trim() });
      const successMessage = result.message || 'Your account is verified. Sign in with your email and password.';
      showToast(successMessage, { title: 'Account verified' });
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Login',
          params: {
            email: normalizedEmail,
            verificationComplete: true,
            message: successMessage,
          },
        }],
      });
    } catch (error) {
      setErrors(getScreenFieldErrors(error, { code: 'otp', verification_code: 'otp' }));
      setGeneralError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateEmail = (value) => {
    setEmail(value);
    setErrors((current) => ({ ...current, email: '' }));
    setGeneralError('');
  };

  const updateOtp = (value) => {
    setOtp(value.replace(/\D/g, '').slice(0, 6));
    setErrors((current) => ({ ...current, otp: '' }));
    setGeneralError('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityLabel="Back" disabled={submitting} onPress={() => navigation.goBack()} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}><AppIcon name="back" color={colors.primaryDark} size={20} /></Pressable>

          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><AppIcon name="petCheck" color={colors.primaryDark} size={30} /></View>
          <Text style={[styles.title, { color: colors.ink }]}>Verify approval code</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>The clinic must approve your account before it sends a one-time code. Enter that code here when it arrives.</Text>

          {route?.params?.registrationPending ? (
            <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
              <AppIcon name="alerts" color={colors.success} size={18} />
              <Text style={[styles.noticeText, { color: colors.inkSoft }]}>{route.params.message || 'Your request is waiting for clinic approval. You can return later when the code arrives.'}</Text>
            </View>
          ) : null}

          <ConnectionNotice error={generalError} onRetry={isConnectionError(generalError) ? handleVerification : undefined} loading={submitting} />

          <FormInput label="Email" icon="mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={updateEmail} placeholder="client@email.com" error={errors.email} style={styles.field} />
          <FormInput label="6-digit approval code" icon="health" autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={updateOtp} placeholder="000000" error={errors.otp} style={styles.field} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            disabled={submitting}
            style={[styles.primaryButton, { backgroundColor: colors.primary }, submitting && styles.buttonDisabled]}
            onPress={handleVerification}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryText}>Verify Code</Text>}
          </Pressable>

          <Text style={[styles.help, { color: colors.muted }]}>No code yet? Wait for the clinic&apos;s approval email or contact the clinic to check your request.</Text>
          <Pressable disabled={submitting} onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={[styles.loginLinkText, { color: colors.primary }]}>Back to login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validateVerification(email, otp) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!/^\d{6}$/.test(otp.trim())) errors.otp = 'Enter the 6-digit code from the clinic.';
  return errors;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  back: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl },
  title: { fontSize: 25, lineHeight: 31, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.lg },
  subtitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: spacing.sm, marginBottom: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: 11, padding: spacing.md, marginBottom: spacing.sm },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_600SemiBold' },
  errorBox: { borderWidth: 1, borderRadius: 11, padding: spacing.sm, marginBottom: spacing.xs },
  errorText: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_700Bold' },
  field: { marginTop: spacing.md },
  primaryButton: { width: '100%', minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  buttonDisabled: { opacity: 0.62 },
  help: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: spacing.lg },
  loginLink: { alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  loginLinkText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
});
