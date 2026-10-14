import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppointmentCard from '../components/AppointmentCard';
import VisitRatingModal from '../components/VisitRatingModal';
import { appImages } from '../assets/images';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import ConnectionNotice from '../components/ConnectionNotice';
import { isConnectionError } from '../api/errors';
import AppIcon from '../components/AppIcon';
import AnimatedReveal from '../components/AnimatedReveal';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import FormInput from '../components/FormInput';
import HeaderBar from '../components/HeaderBar';
import NotificationPanel from '../components/NotificationPanel';
import PetAvatar from '../components/PetAvatar';
import { AppointmentCardSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import ThemedArtwork from '../components/ThemedArtwork';
import { useClientData } from '../context/ClientDataContext';
import { useFeedback } from '../context/FeedbackContext';
import { usePetSelection } from '../context/PetSelectionContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { showAppAlert } from '../utils/appAlert';
import { getThemedStatusTone } from '../utils/statusStyles';

const services = ['Wellness Checkup', 'Consultation', 'Vaccination', 'Grooming', 'Emergency Review'];
const filterOptions = ['All', 'Approved', 'Pending', 'Completed', 'Cancelled'];

export default function AppointmentsScreen({ navigation, route }) {
  const listRef = useRef(null);
  const { colors: themeColors, isNightMode } = useTheme();
  const {
    appointments,
    cancelAppointment,
    createAppointment,
    loading,
    pets,
  } = useClientData();
  const { showToast } = useFeedback();
  const { selectedPetId, setSelectedPetId } = usePetSelection();
  const refreshControl = useClientRefreshControl();
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualFormOpen, setFormOpen] = useState(false);
  const [serviceType, setServiceType] = useState(services[0]);
  const [preferredDate, setPreferredDate] = useState(getDefaultAppointmentDate);
  const [preferredTime, setPreferredTime] = useState('09:30 AM');
  const [concern, setConcern] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formStep, setFormStep] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [ratingAppointment, setRatingAppointment] = useState(null);

  const approvedPets = useMemo(
    () => pets.filter((pet) => String(pet.status || '').toLowerCase() === 'approved'),
    [pets],
  );
  const formOpen = manualFormOpen || Boolean(route?.params?.startBooking && approvedPets.length);
  const selectedApprovedPet = approvedPets.find((pet) => String(pet.id) === String(selectedPetId));
  const petId = selectedPetId === 'All' || !selectedApprovedPet ? approvedPets[0]?.id : selectedPetId;

  const counts = useMemo(() => {
    const next = { All: appointments.length, Approved: 0, Pending: 0, Completed: 0, Cancelled: 0 };
    appointments.forEach((appointment) => {
      if (next[appointment.status] !== undefined) next[appointment.status] += 1;
    });
    return next;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (activeFilter === 'All') return appointments;
    return appointments.filter((appointment) => appointment.status === activeFilter);
  }, [activeFilter, appointments]);

  const handleSubmit = async () => {
    if (submitting) return;
    const pet = approvedPets.find((item) => String(item.id) === String(petId));
    const nextErrors = validateAppointmentForm({ concern, petId, preferredDate, preferredTime, serviceType });

    if (!pet || Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError('Please complete pet, service, date, time, and concern.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createAppointment({
        petId: pet.id,
        requestedDateTime: buildRequestedDateTime(preferredDate.trim(), preferredTime.trim()),
        serviceType,
        reason: concern.trim(),
      });
      setActiveFilter('All');
      setConcern('');
      setFieldErrors({});
      setFormStep(0);
      setFormOpen(false);
      navigation.setParams({ startBooking: undefined });
      showToast('The clinic will confirm your preferred schedule.', { title: 'Appointment requested' });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (id) => {
    showAppAlert('Cancel appointment', 'Cancel this appointment request with the clinic?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(id);
            showToast('The appointment request was cancelled.', { title: 'Request updated' });
          } catch (cancelError) {
            showToast(cancelError?.message || 'The appointment could not be cancelled.', { title: 'Update failed' });
          }
        },
      },
    ]);
  };

  const primaryActionText = isNightMode ? colors.primaryDeep : colors.surface;
  const selectedChipStyle = isNightMode
    ? { backgroundColor: themeColors.primarySoft, borderColor: themeColors.primary }
    : { backgroundColor: themeColors.primary, borderColor: themeColors.primary };
  const selectedChipTextStyle = { color: isNightMode ? themeColors.primaryDark : colors.surface };
  const selectedPet = approvedPets.find((pet) => String(pet.id) === String(petId));

  const openForm = () => {
    if (!formOpen && !approvedPets.length) {
      showToast(
        'Submit a pet profile first and wait for admin verification before requesting an appointment.',
        { title: 'No approved pet', type: 'error' },
      );
      return;
    }

    if (!formOpen) {
      setFormStep(0);
      setFieldErrors({});
      setError('');
    }
    setFormOpen(!formOpen);
    navigation.setParams({ startBooking: undefined });
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const updateField = (setter, field) => (value) => {
    setter(value);
    setError('');
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const moveNext = () => {
    const values = { concern, petId, preferredDate, preferredTime, serviceType };
    const nextErrors = validateAppointmentStep(values, formStep);
    setFieldErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      setError('');
      setFormStep((current) => Math.min(current + 1, 2));
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      {ratingAppointment ? <VisitRatingModal key={ratingAppointment.id} appointment={ratingAppointment} onClose={() => setRatingAppointment(null)} /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'} style={styles.keyboard}>
      <FlatList
        ref={listRef}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        data={loading || formOpen ? [] : filteredAppointments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <>
            <HeaderBar onOpenNotifications={() => setPanelOpen(true)} />
            {!formOpen ? <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: themeColors.ink }]}>Book a{`\n`}Clinic Visit</Text>
                <Text style={[styles.heroText, { color: themeColors.muted }]}>Choose your pet, preferred schedule, and concern.</Text>
              </View>
              <ThemedArtwork source={appImages.booking} style={styles.heroArt} />
            </View>

            <View style={styles.metrics}>
              <StatCard value={counts.Pending} label="Waiting approval" style={styles.metricTile} />
              <StatCard value={counts.Approved} label="Approved visits" style={styles.metricTile} />
              <StatCard value={counts.Completed} label="Completed visits" style={styles.metricTile} />
            </View>

            </> : null}

            <AppCard style={[styles.actionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
              <View style={styles.actionHead}>
                <View style={styles.actionCopy}>
                  <Text style={[styles.actionTitle, { color: themeColors.ink }]}>Appointment Request</Text>
                  <Text style={[styles.actionText, { color: themeColors.muted }]}>One clear form. The clinic confirms the schedule.</Text>
                </View>
                <Pressable accessibilityRole="button" disabled={submitting} style={[styles.actionButton, { backgroundColor: themeColors.primary }]} onPress={openForm}>
                    <Text style={[styles.actionButtonText, { color: primaryActionText }]}>{formOpen ? 'Close' : 'Request Now'}</Text>
                </Pressable>
              </View>

              {formOpen ? (
                <View style={[styles.form, { borderTopColor: themeColors.line }]}> 
                  <AppointmentProgress currentStep={formStep} />
                  <AnimatedReveal key={formStep} distance={5}>
                    {formStep === 0 ? (
                      <FormSection number="1" title="Pet and service" detail="Choose who needs care and what kind of visit this is.">
                        <Text style={[styles.label, { color: themeColors.ink }]}>Pet</Text>
                        <View style={styles.petChoiceRow}>
                          {approvedPets.map((pet) => (
                            <Pressable
                              key={pet.id}
                              onPress={() => {
                                setSelectedPetId(pet.id);
                                setFieldErrors((current) => ({ ...current, petId: '' }));
                              }}
                              style={[
                                styles.petChoice,
                                { backgroundColor: themeColors.surfaceAlt, borderColor: fieldErrors.petId ? themeColors.danger : themeColors.line },
                                String(petId) === String(pet.id) && { backgroundColor: themeColors.primarySoft, borderColor: themeColors.primary },
                              ]}>
                              <PetAvatar pet={pet} size={36} />
                              <Text style={[styles.petChoiceText, { color: String(petId) === String(pet.id) ? themeColors.primaryDark : themeColors.ink }]}>{pet.name}</Text>
                              {String(petId) === String(pet.id) ? <AppIcon name="check" color={themeColors.primary} size={15} /> : null}
                            </Pressable>
                          ))}
                        </View>
                        {fieldErrors.petId ? <Text style={[styles.fieldError, { color: themeColors.danger }]}>{fieldErrors.petId}</Text> : null}

                        <Text style={[styles.label, { color: themeColors.ink }]}>Service type</Text>
                        <View style={styles.chipRow}>
                          {services.map((service) => (
                            <Pressable
                              key={service}
                              onPress={() => updateField(setServiceType, 'serviceType')(service)}
                              style={[
                                styles.chip,
                                { backgroundColor: themeColors.surface, borderColor: fieldErrors.serviceType ? themeColors.danger : themeColors.line },
                                serviceType === service && selectedChipStyle,
                              ]}>
                              <Text style={[styles.chipText, { color: themeColors.muted }, serviceType === service && selectedChipTextStyle]}>{service}</Text>
                            </Pressable>
                          ))}
                        </View>
                        {fieldErrors.serviceType ? <Text style={[styles.fieldError, { color: themeColors.danger }]}>{fieldErrors.serviceType}</Text> : null}
                      </FormSection>
                    ) : null}

                    {formStep === 1 ? (
                      <FormSection number="2" title="Preferred schedule" detail="The clinic reviews this preference before confirming it.">
                        <View style={styles.fieldStack}>
                          <DateTimeField label="Date" value={preferredDate} onChange={updateField(setPreferredDate, 'preferredDate')} minimumDate={new Date()} error={fieldErrors.preferredDate} />
                          <DateTimeField label="Time" mode="time" value={preferredTime} onChange={updateField(setPreferredTime, 'preferredTime')} error={fieldErrors.preferredTime} />
                        </View>
                      </FormSection>
                    ) : null}

                    {formStep === 2 ? (
                      <FormSection number="3" title="Reason and review" detail="A concise note helps staff prepare for the visit.">
                        <FormInput label="Reason for visit" multiline value={concern} onChangeText={updateField(setConcern, 'concern')} placeholder="Tell the clinic what your pet needs." error={fieldErrors.concern} />
                        <View style={[styles.reviewBox, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}> 
                          <AppointmentReviewRow label="Pet" value={selectedPet?.name || 'Not selected'} />
                          <AppointmentReviewRow label="Service" value={serviceType || 'Not selected'} />
                          <AppointmentReviewRow label="Preferred" value={`${preferredDate} at ${preferredTime}`} last />
                        </View>
                      </FormSection>
                    ) : null}
                  </AnimatedReveal>

                  <Text
                    style={[
                      styles.helpNote,
                      { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.lineStrong, color: themeColors.muted },
                    ]}>
                    The clinic will review your request and confirm the schedule.
                  </Text>
                </View>
              ) : null}
            </AppCard>

            {!formOpen ? <>
            <Text style={[styles.timelineTitle, { color: themeColors.ink }]}>My Appointment Timeline</Text>
            <Text style={[styles.timelineSub, { color: themeColors.muted }]}>Latest requests first</Text>

            <View style={styles.filterRow}>
              {filterOptions.map((filter) => {
                const active = activeFilter === filter;
                const tone = getFilterTone(filter, themeColors, isNightMode);

                return (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterChip,
                      { backgroundColor: themeColors.surface, borderColor: themeColors.line },
                      active && { backgroundColor: tone.background, borderColor: tone.accent },
                    ]}
                    onPress={() => setActiveFilter(filter)}>
                    <Text style={[styles.filterText, { color: themeColors.muted }, active && { color: tone.text }]}>
                      {filter} {counts[filter] ?? 0}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </> : null}
          </>
        }
        ListEmptyComponent={
          formOpen ? null : loading ? (
            <View>
              <AppointmentCardSkeleton />
              <AppointmentCardSkeleton />
            </View>
          ) : (
            <EmptyState
              title={activeFilter === 'All' ? 'No appointment yet' : `No ${activeFilter.toLowerCase()} appointments`}
              message={activeFilter === 'All' ? 'Your clinic visit requests will appear here.' : 'Try selecting another appointment status.'}
              icon="appointment"
            />
          )
        }
        renderItem={({ item }) => <AppointmentCard appointment={item} onCancel={() => handleCancel(item.id)} onRate={() => setRatingAppointment(item)} />}
      />
      {formOpen ? (
        <View style={[styles.formFooter, { backgroundColor: themeColors.surface, borderTopColor: themeColors.line }]}>
                  <ConnectionNotice error={error} onRetry={isConnectionError(error) ? handleSubmit : undefined} loading={submitting} />

                  <View style={styles.formActions}>
                    <AppButton disabled={submitting} variant="secondary" icon={formStep === 0 ? 'close' : 'back'} title={formStep === 0 ? 'Close' : 'Back'} onPress={formStep === 0 ? openForm : () => setFormStep((current) => current - 1)} style={styles.formAction} />
                    <AppButton disabled={submitting} icon={formStep === 2 ? 'send' : 'forward'} loading={formStep === 2 && submitting} title={formStep === 2 ? 'Send Request' : formStep === 1 ? 'Review Request' : 'Continue'} onPress={formStep === 2 ? handleSubmit : moveNext} style={styles.formActionPrimary} />
                  </View>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function buildRequestedDateTime(date, time) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return `${date}T09:30:00`;

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return `${date}T${String(hour).padStart(2, '0')}:${minute}:00`;
}

function getDefaultAppointmentDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validateAppointmentStep(values, step) {
  const errors = {};

  if (step === 0) {
    if (!values.petId) errors.petId = 'Choose a pet.';
    if (!values.serviceType) errors.serviceType = 'Choose a service.';
  }

  if (step === 1) {
    if (!values.preferredDate) errors.preferredDate = 'Choose a preferred date.';
    if (!values.preferredTime) errors.preferredTime = 'Choose a preferred time.';
    if (values.preferredDate) {
      const selected = new Date(`${values.preferredDate}T23:59:59`);
      if (Number.isNaN(selected.getTime())) errors.preferredDate = 'Choose a valid date.';
      else if (selected < new Date()) errors.preferredDate = 'Choose today or a future date.';
    }
  }

  if (step === 2 && !String(values.concern || '').trim()) errors.concern = 'Tell the clinic what your pet needs.';
  return errors;
}

function validateAppointmentForm(values) {
  return [0, 1, 2].reduce((errors, step) => ({ ...errors, ...validateAppointmentStep(values, step) }), {});
}

function getFilterTone(filter, themeColors, isNightMode) {
  if (filter === 'All') {
    return {
      text: themeColors.primaryDark,
      background: themeColors.primarySoft,
      accent: themeColors.primary,
    };
  }

  return getThemedStatusTone(filter, themeColors, isNightMode);
}

function FormSection({ children, detail, number, title }) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.formSection, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
      <View style={styles.formSectionHead}>
        <View style={[styles.stepBadge, { backgroundColor: themeColors.primarySoft, borderColor: themeColors.lineStrong }]}>
          <Text style={[styles.stepBadgeText, { color: themeColors.primaryDark }]}>{number}</Text>
        </View>
        <View style={styles.formSectionCopy}>
          <Text style={[styles.formSectionTitle, { color: themeColors.ink }]}>{title}</Text>
          <Text style={[styles.formSectionDetail, { color: themeColors.muted }]}>{detail}</Text>
        </View>
      </View>
      <View style={styles.formSectionBody}>{children}</View>
    </View>
  );
}

function AppointmentProgress({ currentStep }) {
  const { colors: themeColors } = useTheme();
  const steps = ['Visit', 'Schedule', 'Review'];

  return (
    <View accessibilityLabel={`Step ${currentStep + 1} of 3`} style={styles.progressRow}>
      {steps.map((label, index) => {
        const active = index <= currentStep;
        return (
          <View key={label} style={styles.progressItem}>
            <View style={[styles.progressDot, { backgroundColor: active ? themeColors.primary : themeColors.surfaceAlt, borderColor: active ? themeColors.primary : themeColors.line }]}> 
              {index < currentStep ? <AppIcon name="check" color="#FFFFFF" size={12} /> : <Text style={[styles.progressNumber, { color: active ? '#FFFFFF' : themeColors.muted }]}>{index + 1}</Text>}
            </View>
            <Text style={[styles.progressLabel, { color: index === currentStep ? themeColors.ink : themeColors.muted }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AppointmentReviewRow({ label, last, value }) {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[styles.reviewRow, !last && { borderBottomColor: themeColors.line, borderBottomWidth: 1 }]}> 
      <Text style={[styles.reviewLabel, { color: themeColors.muted }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: themeColors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  list: { flex: 1 },
  formFooter: { borderTopWidth: 1, paddingHorizontal: spacing.screen, paddingVertical: spacing.sm },
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  hero: {
    minHeight: 136,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroCopy: { flex: 1, paddingRight: spacing.sm },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 28, fontFamily: 'Manrope_800ExtraBold' },
  heroText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: spacing.sm },
  heroArt: { width: 132, height: 132, borderRadius: spacing.radius },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricTile: { flex: 1 },
  actionCard: { marginBottom: spacing.md, backgroundColor: colors.surface },
  actionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.ink, fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  actionText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, lineHeight: 18 },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonText: { color: colors.surface, fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  timelineTitle: { color: colors.ink, fontSize: 17, fontFamily: 'Manrope_800ExtraBold', marginBottom: 2 },
  timelineSub: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  filterChip: {
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  filterText: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope_700Bold' },
  form: {
    marginTop: spacing.md,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  progressItem: { flex: 1, alignItems: 'center', gap: 5 },
  progressDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressNumber: { fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  progressLabel: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  formSection: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: spacing.radiusSm,
    padding: spacing.md,
  },
  formSectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.primarySoft,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.primaryDark, fontFamily: 'Manrope_800ExtraBold' },
  formSectionCopy: { flex: 1 },
  formSectionTitle: { color: colors.ink, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  formSectionDetail: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  formSectionBody: { gap: spacing.xs },
  petChoiceRow: { gap: spacing.sm },
  petChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.sm },
  petChoiceText: { flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 13 },
  fieldStack: { gap: spacing.md },
  label: { color: colors.ink, fontSize: 13, fontFamily: 'Manrope_700Bold', marginBottom: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontFamily: 'Manrope_700Bold',
  },
  activeChipText: {
    color: colors.surface,
  },
  fieldError: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
  reviewBox: { borderWidth: 1, borderRadius: 10, marginTop: spacing.md, paddingHorizontal: spacing.md },
  reviewRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingVertical: spacing.sm },
  reviewLabel: { width: 64, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  reviewValue: { flex: 1, textAlign: 'right', fontFamily: 'Manrope_700Bold', fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: 'Manrope_700Bold', marginTop: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.sm },
  formAction: { flex: 1 },
  formActionPrimary: { flex: 1.25 },
  helpNote: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: spacing.radiusSm,
    color: colors.muted,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
});
