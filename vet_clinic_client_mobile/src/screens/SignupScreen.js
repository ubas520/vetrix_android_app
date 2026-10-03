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

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const { showToast } = useFeedback();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (submitting) return;

    const nextErrors = validateSignup({ email, name, password, phone });
    setErrors(nextErrors);
    setGeneralError('');
    if (Object.keys(nextErrors).length) return;

    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
      });
      const approvalMessage = 'Your request was sent. Wait for clinic approval, then enter the one-time code sent to your email.';
      showToast(approvalMessage, { title: 'Approval requested' });
      navigation.replace('VerifyOtp', {
        email: normalizedEmail,
        registrationPending: true,
        message: approvalMessage,
      });
    } catch (error) {
      setErrors(getScreenFieldErrors(error, { full_name: 'name', phone_number: 'phone' }));
      setGeneralError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field, setter) => (value) => {
    setter(value);
    setErrors((current) => ({ ...current, [field]: '' }));
    setGeneralError('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityLabel="Back to login" disabled={submitting} onPress={() => navigation.goBack()} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.line }]}><AppIcon name="back" color={colors.primaryDark} size={20} /></Pressable>
          <View style={styles.brandRow}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}><AppIcon name="pets" color="#FFFFFF" size={24} /></View>
            <View><Text style={[styles.brand, { color: colors.ink }]}>Join Vetrix</Text><Text style={[styles.caption, { color: colors.muted }]}>Request a client account</Text></View>
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Your pets, all in one place.</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Send your details to the clinic. An administrator must approve the account before you can sign in.</Text>

          <ConnectionNotice error={generalError} onRetry={isConnectionError(generalError) ? handleSignup : undefined} loading={submitting} />

          <Field label="Full name" icon="profile" value={name} onChangeText={updateField('name', setName)} placeholder="Maria Santos" error={errors.name} />
          <Field label="Email" icon="mail" value={email} onChangeText={updateField('email', setEmail)} placeholder="client@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
          <Field label="Phone number" icon="phone" value={phone} onChangeText={updateField('phone', setPhone)} placeholder="09XXXXXXXXX" keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
          <Field label="Password" icon="health" value={password} onChangeText={updateField('password', setPassword)} placeholder="Create a strong password" autoComplete="new-password" secureTextEntry error={errors.password} />
          <Text style={[styles.passwordHelp, { color: colors.muted }]}>Use 10+ characters with uppercase, lowercase, a number, and a symbol.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            disabled={submitting}
            style={[styles.primaryButton, { backgroundColor: colors.primary }, submitting && styles.buttonDisabled]}
            onPress={handleSignup}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryText}>Send Account Request</Text>}
          </Pressable>
          <View style={styles.loginRow}><Text style={[styles.loginCopy, { color: colors.muted }]}>Already have an account? </Text><Pressable disabled={submitting} onPress={() => navigation.navigate('Login')}><Text style={[styles.loginLink, { color: colors.primary }]}>Log in</Text></Pressable></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function validateSignup({ email, name, password, phone }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your full name.';
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  else if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter at least 10 digits.';
  if (!password) errors.password = 'Create a password.';
  else if (password.length < 10) errors.password = 'Use at least 10 characters.';
  else if (!/[A-Z]/.test(password)) errors.password = 'Add at least one uppercase letter.';
  else if (!/[a-z]/.test(password)) errors.password = 'Add at least one lowercase letter.';
  else if (!/\d/.test(password)) errors.password = 'Add at least one number.';
  else if (!/[^A-Za-z0-9]/.test(password)) errors.password = 'Add at least one symbol.';
  return errors;
}

function Field({ label, icon, ...inputProps }) {
  return <FormInput label={label} icon={icon} {...inputProps} style={styles.field} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  back: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  logo: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  caption: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  title: { fontSize: 25, lineHeight: 31, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.xxl },
  subtitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: spacing.sm, marginBottom: spacing.lg },
  errorBox: { borderWidth: 1, borderRadius: 11, padding: spacing.sm, marginBottom: spacing.xs },
  errorText: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_700Bold' },
  field: { marginTop: spacing.md },
  passwordHelp: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs },
  primaryButton: { width: '100%', minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  buttonDisabled: { opacity: 0.62 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginCopy: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  loginLink: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
});
