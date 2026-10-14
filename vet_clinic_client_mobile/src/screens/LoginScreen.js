import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getScreenFieldErrors, isConnectionError } from '../api/errors';
import { appImages } from '../assets/images';
import AppIcon from '../components/AppIcon';
import FormInput from '../components/FormInput';
import ConnectionNotice from '../components/ConnectionNotice';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const { colors, isNightMode } = useTheme();
  const screenBackground = isNightMode ? colors.background : '#FFFFFF';
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const verificationComplete = Boolean(route?.params?.verificationComplete || route?.params?.passwordResetComplete);

  const handleLogin = async () => {
    if (submitting) return;

    const nextErrors = validateLogin(email, password);
    setErrors(nextErrors);
    setGeneralError('');
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (error) {
      setErrors(getScreenFieldErrors(error));
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

  const updatePassword = (value) => {
    setPassword(value);
    setErrors((current) => ({ ...current, password: '' }));
    setGeneralError('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBackground }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}><AppIcon name="pets" color="#FFFFFF" size={25} strokeWidth={2.4} /></View>
            <View>
              <Text style={[styles.brand, { color: colors.ink }]}>Vetrix</Text>
              <Text style={[styles.caption, { color: colors.muted }]}>Client Pet Care Access</Text>
            </View>
          </View>

          <Image
            accessibilityLabel="Friendly golden retriever waving hello"
            resizeMode="cover"
            source={appImages.loginDog}
            style={styles.art}
          />

          <Text style={[styles.title, { color: colors.ink }]}>Welcome back!</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Log in to continue.</Text>

          {verificationComplete ? (
            <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
              <AppIcon name="petCheck" color={colors.success} size={17} />
              <Text style={[styles.noticeText, { color: colors.inkSoft }]}>
                {route.params?.message || 'Your account is verified. Sign in with your email and password.'}
              </Text>
            </View>
          ) : null}

          <ConnectionNotice error={generalError} onRetry={isConnectionError(generalError) ? handleLogin : undefined} loading={submitting} />

          <FormInput label="Email" icon="mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={updateEmail} placeholder="client@vetclinic.test" value={email} error={errors.email} style={styles.field} />
          <FormInput
            label="Password"
            icon="health"
            autoComplete="current-password"
            onChangeText={updatePassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            error={errors.password}
            style={styles.field}
            right={
            <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)}>
              <AppIcon name={showPassword ? 'eyeOff' : 'eye'} color={colors.muted} size={18} />
            </Pressable>
            }
          />

          <Pressable accessibilityRole="button" disabled={submitting} onPress={() => navigation.navigate('ForgotPassword', { email })} style={styles.forgot}><Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text></Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            disabled={submitting}
            style={[styles.loginButton, { backgroundColor: colors.primary }, submitting && styles.buttonDisabled]}
            onPress={handleLogin}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.loginText}>Login</Text>}
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={[styles.signupCopy, { color: colors.muted }]}>Don&apos;t have an account? </Text>
            <Pressable disabled={submitting} onPress={() => navigation.navigate('Signup')}><Text style={[styles.signupLink, { color: colors.primary }]}>Sign up</Text></Pressable>
          </View>
          <Pressable disabled={submitting} onPress={() => navigation.navigate('VerifyOtp', { email })} style={styles.verifyLink}>
            <Text style={[styles.verifyLinkText, { color: colors.primary }]}>Verify approval code</Text>
          </Pressable>
          <View style={styles.secureRow}><AppIcon name="petCheck" color={colors.mutedSoft} size={14} /><Text style={[styles.secureText, { color: colors.muted }]}>Secured and trusted by Vetrix</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validateLogin(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password.trim()) errors.password = 'Enter your password.';
  return errors;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold' },
  caption: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  art: { alignSelf: 'center', width: 220, height: 220, marginTop: spacing.md },
  title: { fontSize: 25, lineHeight: 31, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontSize: 14, fontFamily: 'Manrope_500Medium', textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 11, padding: spacing.sm, marginBottom: spacing.sm },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_600SemiBold' },
  errorBox: { borderWidth: 1, borderRadius: 11, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_700Bold' },
  field: { marginTop: spacing.sm },
  forgot: { alignSelf: 'flex-end', paddingVertical: spacing.sm },
  forgotText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  loginButton: { width: '100%', minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  loginText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  buttonDisabled: { opacity: 0.62 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  signupCopy: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  signupLink: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  verifyLink: { alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  verifyLinkText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  secureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: 30 },
  secureText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
});
