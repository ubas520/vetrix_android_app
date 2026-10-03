import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';

import { useClientData } from '../context/ClientDataContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../context/ThemeContext';
import AppButton from './AppButton';
import FormInput from './FormInput';

const ratingLabels = ['Choose a star rating', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function VisitRatingModal({ appointment, onClose }) {
  const { colors } = useTheme();
  const { rateAppointment, refresh } = useClientData();
  const { showToast } = useFeedback();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  const close = () => { if (!busy.current) onClose(); };
  const submit = async () => {
    if (busy.current || !rating) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      await rateAppointment(appointment.id, rating, comment.trim());
      showToast('Your feedback helps the clinic improve.', { title: 'Thank you for your rating' });
      onClose();
    } catch (submitError) {
      setError(submitError?.message || 'Your rating could not be sent. Please try again.');
      if (submitError?.status === 409) void refresh();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={styles.backdrop}>
        <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>Rate your visit</Text>
              <Text style={[styles.prompt, { color: colors.inkSoft }]}>How was your visit with {appointment.petName}?</Text>
              <Text style={[styles.detail, { color: colors.muted }]}>{appointment.service || appointment.serviceType}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}, ${ratingLabels[value]}`}
                    accessibilityState={{ checked: rating === value, disabled: submitting }}
                    aria-checked={rating === value}
                    disabled={submitting}
                    onPress={() => { setRating(value); setError(''); }}
                    style={styles.star}>
                    <Star size={32} color={value <= rating ? colors.primaryDark : colors.mutedSoft} fill={value <= rating ? colors.primaryDark : 'transparent'} />
                  </Pressable>
                ))}
              </View>
              <Text accessibilityLiveRegion="polite" style={[styles.ratingLabel, { color: colors.primaryDark }]}>{ratingLabels[rating]}</Text>
              <FormInput
                label="Comment (optional)"
                placeholder="Tell us what went well or what we can improve."
                multiline
                maxLength={1000}
                editable={!submitting}
                value={comment}
                onChangeText={setComment}
              />
              <Text style={[styles.detail, { color: colors.muted }]}>Only you and the clinic can see this feedback. One rating per visit.</Text>
              {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              <View style={styles.actions}>
                <AppButton title="Not now" variant="outline" onPress={close} disabled={submitting} style={styles.action} />
                <AppButton title="Submit rating" onPress={submit} disabled={!rating} loading={submitting} style={styles.action} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)' },
  keyboard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '100%', borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  content: { padding: 20 },
  title: { fontSize: 23, fontFamily: 'Manrope_800ExtraBold' },
  prompt: { marginTop: 10, fontSize: 16, lineHeight: 23, fontFamily: 'Manrope_700Bold' },
  detail: { marginTop: 8, fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_500Medium' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  star: { minWidth: 44, minHeight: 48, flex: 1, maxWidth: 64, alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { textAlign: 'center', marginTop: 6, marginBottom: 20, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  error: { marginTop: 12, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  action: { flex: 1 },
});
