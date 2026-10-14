import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestPasswordReset, resetClientPassword } from '../api/authApi';
import { getScreenFieldErrors } from '../api/errors';
import ConnectionNotice from '../components/ConnectionNotice';
import FormInput from '../components/FormInput';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [codeRequested, setCodeRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (resend = false) => {
    if (pending.current || (resend && cooldown)) return;
    const sending = !codeRequested || resend;
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) nextErrors.email = 'Enter a valid email address.';
    if (!sending) {
      if (!/^\d{6}$/.test(otp)) nextErrors.otp = 'Enter the 6-digit OTP from your reset email.';
      if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        nextErrors.password = 'Use 10+ characters with uppercase, lowercase, a number, and a symbol.';
      }
      if (password !== confirmPassword) nextErrors.confirmPassword = 'The passwords do not match.';
    }
    setErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length) return;
    pending.current = true;
    setBusy(true);
    try {
      if (sending) {
        const result = await requestPasswordReset(normalizedEmail);
        setEmail(normalizedEmail);
        setCodeRequested(true);
        setOtp('');
        setNotice(result.message);
        setCooldown(60);
      } else {
        const result = await resetClientPassword({ email: normalizedEmail, otp, password, confirmPassword });
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        navigation.reset({ index: 0, routes: [{ name: 'Login', params: { email: normalizedEmail, passwordResetComplete: true, message: result.message } }] });
      }
    } catch (failure) {
      setErrors(getScreenFieldErrors(failure));
      setError(failure);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const field = (name, setter) => (value) => {
    setter(value);
    setErrors((current) => ({ ...current, [name]: '' }));
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Back to login</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{codeRequested ? 'Reset your password' : 'Forgot password?'}</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>{codeRequested ? 'The clinic admin must approve your request before an OTP is emailed. When it arrives, enter the code and choose your new password.' : 'Enter your account email to request a password reset. The clinic admin will review your request and email a 6-digit OTP after approval.'}</Text>
          {notice ? <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.inkSoft }]}>{notice}</Text> : null}
          <ConnectionNotice error={error} />
          <FormInput label="Email" icon="mail" value={email} onChangeText={field('email', setEmail)} editable={!busy && !codeRequested} autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={errors.email} style={styles.field} />
          {codeRequested ? <>
            <FormInput label="6-digit reset OTP" icon="health" value={otp} onChangeText={field('otp', (value) => setOtp(value.replace(/\D/g, '').slice(0, 6)))} editable={!busy} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} error={errors.otp} style={styles.field} />
            <FormInput label="New password" icon="health" value={password} onChangeText={field('password', setPassword)} editable={!busy} secureTextEntry autoComplete="new-password" error={errors.password} style={styles.field} />
            <Text style={[styles.copy, { color: colors.muted }]}>Use 10+ characters with uppercase, lowercase, a number, and a symbol. The OTP expires 10 minutes after admin approval.</Text>
            <FormInput label="Confirm new password" icon="health" value={confirmPassword} onChangeText={field('confirmPassword', setConfirmPassword)} editable={!busy} secureTextEntry autoComplete="new-password" error={errors.confirmPassword} style={styles.field} />
          </> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => submit()} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{codeRequested ? 'Verify OTP & reset password' : 'Request admin approval'}</Text>}
          </Pressable>
          {codeRequested ? <>
            <Pressable accessibilityRole="button" disabled={busy || cooldown > 0} onPress={() => submit(true)} style={styles.link}>
              <Text style={[styles.linkText, { color: colors.primary, opacity: busy || cooldown > 0 ? 0.6 : 1 }]}>{cooldown ? `Request again in ${cooldown}s` : 'Request a new OTP approval'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setCodeRequested(false); setOtp(''); setPassword(''); setConfirmPassword(''); setNotice(''); setError(null); setErrors({}); }} style={styles.link}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Use a different email</Text>
            </Pressable>
          </> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
            const normalizedEmail = email.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setErrors({ email: 'Enter the email that received your OTP.' }); return; }
            setEmail(normalizedEmail); setCodeRequested(true); setErrors({}); setError(null);
          }} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Already approved? Enter your OTP</Text>
          </Pressable>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flexGrow: 1, padding: 28 },
  title: { fontSize: 25, fontFamily: 'Manrope_800ExtraBold', marginTop: 28 },
  copy: { fontSize: 14, lineHeight: 21, fontFamily: 'Manrope_500Medium', marginTop: 12 },
  field: { marginTop: 18 },
  button: { minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: 12 },
  linkText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
});
