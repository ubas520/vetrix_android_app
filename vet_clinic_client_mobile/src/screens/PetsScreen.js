import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import AppCard from '../components/AppCard';
import ConnectionNotice from '../components/ConnectionNotice';
import { isConnectionError } from '../api/errors';
import { getPetStatusLabel } from '../utils/careStatus';
import AppButton from '../components/AppButton';
import AppIcon from '../components/AppIcon';
import AnimatedReveal from '../components/AnimatedReveal';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import FormInput from '../components/FormInput';
import HeaderBar from '../components/HeaderBar';
import NotificationPanel from '../components/NotificationPanel';
import NumberStepper from '../components/NumberStepper';
import PetAvatar from '../components/PetAvatar';
import PetCard from '../components/PetCard';
import { PetCardSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useClientData } from '../context/ClientDataContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../context/ThemeContext';
import useClientRefreshControl from '../hooks/useClientRefreshControl';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { getThemedStatusTone } from '../utils/statusStyles';

const speciesOptions = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'];
const sexOptions = ['Male', 'Female', 'Unknown'];
const filterOptions = ['All', 'Approved', 'Pending', 'In Person Confirmation', 'Rejected'];

const emptyPetForm = {
  name: '',
  species: '',
  breed: '',
  sex: '',
  birthDate: '',
  weight: '',
  color: '',
  allergies: '',
  criticalNotes: '',
  notes: '',
  photoAttached: false,
  photoFile: null,
  photoMimeType: '',
  photoName: '',
  photoUri: '',
};

export default function PetsScreen({ navigation }) {
  const { colors: themeColors, isNightMode } = useTheme();
  const { createPet, createPetEditRequest, editRequests, loading, pets } = useClientData();
  const { showToast } = useFeedback();
  const refreshControl = useClientRefreshControl();
  const [panelOpen, setPanelOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const petList = useMemo(() => pets.map(normalizePet), [pets]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyPetForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editPet, setEditPet] = useState(null);
  const [editForm, setEditForm] = useState(emptyPetForm);
  const [editError, setEditError] = useState('');

  const counts = useMemo(() => {
    const next = { All: petList.length, Approved: 0, Pending: 0, 'In Person Confirmation': 0, Rejected: 0 };
    petList.forEach((pet) => {
      if (next[pet.status] !== undefined) next[pet.status] += 1;
    });
    return next;
  }, [petList]);

  const filteredPets = useMemo(() => {
    if (activeFilter === 'All') return petList;
    return petList.filter((pet) => pet.status === activeFilter);
  }, [activeFilter, petList]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const updateEditForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    setEditError('');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const submittedPet = await createPet(form);
      const petName = submittedPet?.name || form.name.trim();
      setForm({ ...emptyPetForm });
      setFormOpen(false);
      setActiveFilter('Pending');
      showToast(
        `${petName}'s profile is waiting for admin verification. Booking and QR access stay locked until approval.`,
        { title: 'Pet submitted' },
      );
    } catch (submissionError) {
      const fieldMessage = Object.values(submissionError?.fieldErrors || {}).find(Boolean);
      setError(fieldMessage || submissionError);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditRequest = (pet) => {
    if (pet.status !== 'Approved') {
      showToast(
        `${pet.name}'s profile must be approved before you can request changes.`,
        { title: 'Profile still under review', type: 'error' },
      );
      return;
    }

    setFormOpen(false);
    setForm({ ...emptyPetForm });
    setError('');
    setEditForm(buildPetEditForm(pet));
    setEditError('');
    setEditPet(pet);
  };

  const submitEditRequest = async () => {
    if (!editPet || submitting) return;

    const changes = getPetEditChanges(editPet, editForm);
    if (!changes.length) {
      setEditError('Change at least one pet detail before sending this request.');
      return;
    }

    setSubmitting(true);
    setEditError('');
    try {
      const submittedRequests = await createPetEditRequest({
        petId: editPet.id,
        ...editForm,
      });
      const requestCount = submittedRequests.length || changes.length;
      const petName = editPet.name;

      setEditPet(null);
      setEditForm({ ...emptyPetForm });
      showToast(
        `${requestCount} ${requestCount === 1 ? 'change is' : 'changes are'} waiting for admin review. ${petName}'s approved profile stays active until then.`,
        { title: 'Changes submitted' },
      );
    } catch (submissionError) {
      const fieldMessage = Object.values(submissionError?.fieldErrors || {}).find(Boolean);
      setEditError(fieldMessage || submissionError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <FlatList
        data={loading ? [] : filteredPets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <>
            <HeaderBar onOpenNotifications={() => setPanelOpen(true)} />
            <View style={styles.hero}>
              <View style={styles.titleCopy}>
                <Text style={[styles.heroTitle, { color: themeColors.ink }]}>My Pets</Text>
                <Text style={[styles.heroText, { color: themeColors.muted }]}>View clinic pet profiles and care details.</Text>
              </View>
              <Pressable
                accessibilityLabel={formOpen ? 'Close pet registration form' : 'Add a pet'}
                accessibilityRole="button"
                disabled={submitting}
                style={[styles.addButton, { backgroundColor: themeColors.primary }, submitting && styles.disabledButton]}
                onPress={() => {
                  if (formOpen) {
                    setFormOpen(false);
                    setError('');
                    return;
                  }
                  setForm({ ...emptyPetForm });
                  setError('');
                  setEditPet(null);
                  setEditForm({ ...emptyPetForm });
                  setEditError('');
                  setFormOpen(true);
                }}>
                <AppIcon name={formOpen ? 'close' : 'plus'} color="#FFFFFF" size={15} />
                <Text style={styles.addButtonText}>{formOpen ? 'Close' : 'Add Pet'}</Text>
              </Pressable>
            </View>

            {formOpen ? (
              <PetFormCard
                form={form}
                error={error}
                mode="add"
                submitting={submitting}
                onCancel={() => {
                  setFormOpen(false);
                  setForm({ ...emptyPetForm });
                  setError('');
                }}
                onSubmit={handleSubmit}
                onUpdate={updateForm}
              />
            ) : null}

            {editPet ? (
              <PetFormCard
                form={editForm}
                error={editError}
                mode="edit"
                petName={editPet.name}
                submitting={submitting}
                onCancel={() => {
                  setEditPet(null);
                  setEditForm({ ...emptyPetForm });
                  setEditError('');
                }}
                onSubmit={submitEditRequest}
                onUpdate={updateEditForm}
              />
            ) : null}

            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text style={[styles.filterTitle, { color: themeColors.ink }]}>Pet status</Text>
                <Text style={[styles.filterSummary, { color: themeColors.muted }]}>
                  {filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'} shown
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Filter pets by status" contentContainerStyle={styles.filterRow}>
                {filterOptions.map((filter) => {
                  const active = activeFilter === filter;
                  const count = counts[filter] ?? 0;
                  const tone = getFilterTone(filter, themeColors, isNightMode);

                  return (
                    <Pressable
                      key={filter}
                      accessibilityLabel={`${getPetStatusLabel(filter)}, ${count} ${count === 1 ? 'pet' : 'pets'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.filterChip,
                        { backgroundColor: themeColors.surface, borderColor: themeColors.line },
                        active && { backgroundColor: tone.background, borderColor: tone.accent },
                        pressed && styles.filterChipPressed,
                      ]}
                      onPress={() => setActiveFilter(filter)}>
                      <View style={[styles.filterDot, { backgroundColor: tone.accent }]} />
                      <Text
                        numberOfLines={1}
                        style={[styles.filterText, { color: themeColors.inkSoft }, active && { color: tone.text }]}>
                        {getPetStatusLabel(filter)}
                      </Text>
                      <View
                        style={[
                          styles.filterCount,
                          {
                            backgroundColor: active ? themeColors.surface : themeColors.surfaceAlt,
                            borderColor: active ? tone.accent : themeColors.line,
                          },
                        ]}>
                        <Text style={[styles.filterCountText, { color: active ? tone.text : themeColors.muted }]}>
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {editRequests.length ? (
              <AppCard style={styles.requestsCard}>
                <Pressable accessibilityRole="button" accessibilityLabel="Pet Edit Requests" accessibilityState={{ expanded: requestsOpen }} aria-expanded={requestsOpen} onPress={() => setRequestsOpen((open) => !open)} style={styles.requestsToggle}>
                  <View style={styles.requestCopy}>
                    <Text style={[styles.requestsTitle, { color: themeColors.ink }]}>Pet Edit Requests ({editRequests.length})</Text>
                    <Text style={[styles.requestFields, { color: themeColors.muted }]}>{requestsOpen ? 'Hide submitted changes' : 'Track clinic review'}</Text>
                  </View>
                  <AppIcon name={requestsOpen ? 'up' : 'down'} size={20} color={themeColors.primaryDark} />
                </Pressable>
                {requestsOpen && editRequests.map((request) => (
                  <Pressable
                    key={request.id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${String(request.status || 'pending').toLowerCase()} changes for ${request.petName}`}
                    accessibilityHint="Opens the submitted pet information for review"
                    onPress={() => navigation.navigate('PetEditRequestDetails', { request })}
                    style={({ pressed }) => [
                      styles.requestItem,
                      { borderTopColor: themeColors.line },
                      pressed && styles.requestItemPressed,
                    ]}>
                    <View style={styles.requestCopy}>
                      <Text style={[styles.requestPet, { color: themeColors.ink }]}>{request.petName}</Text>
                      <Text style={[styles.requestFields, { color: themeColors.muted }]}>{request.changes.map((change) => change.label).join(', ')}</Text>
                    </View>
                    <View style={styles.requestAction}>
                      <StatusBadge status={request.status} label={getPetStatusLabel(request.status)} />
                      <AppIcon name="forward" color={themeColors.muted} size={17} />
                    </View>
                  </Pressable>
                ))}
              </AppCard>
            ) : null}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View>
              <PetCardSkeleton />
              <PetCardSkeleton />
            </View>
          ) : (
            <EmptyState
              title={activeFilter === 'All' ? 'No pets registered yet' : `No ${activeFilter.toLowerCase()} pets`}
              message={activeFilter === 'All' ? 'Tap Add Pet to submit a profile for admin verification.' : 'Try selecting another pet status.'}
              icon="pets"
            />
          )
        }
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            onPress={() => navigation.navigate('PetDetails', { petId: item.id, pet: item })}
            onRequestEdit={() => startEditRequest(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function PetFormCard({ error, form, mode, onCancel, onSubmit, onUpdate, petName, submitting = false }) {
  const { colors: themeColors, isNightMode } = useTheme();
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const isEdit = mode === 'edit';
  const selectedChipStyle = isNightMode
    ? { backgroundColor: themeColors.primarySoft, borderColor: themeColors.primary }
    : { backgroundColor: themeColors.primary, borderColor: themeColors.primary };
  const selectedChipTextStyle = { color: isNightMode ? themeColors.primaryDark : colors.surface };

  const update = (field, value) => {
    onUpdate(field, value);
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const moveNext = () => {
    const nextErrors = validatePetStep(form, step, isEdit);
    setFieldErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep((current) => Math.min(current + 1, 2));
  };

  const submit = () => {
    const nextErrors = validatePetStep(form, 2, isEdit);
    setFieldErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSubmit();
  };

  const choosePhoto = async () => {
    setPickingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.72,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
          setFieldErrors((current) => ({ ...current, photo: 'Choose an image smaller than 3 MB.' }));
          return;
        }
        update('photoUri', asset.uri);
        update('photoFile', asset.file || null);
        update('photoMimeType', asset.file?.type || asset.mimeType || '');
        update('photoName', asset.fileName || 'pet-photo.jpg');
        update('photoAttached', true);
      }
    } catch {
      setFieldErrors((current) => ({ ...current, photo: 'The photo library could not be opened.' }));
    } finally {
      setPickingPhoto(false);
    }
  };

  return (
    <AppCard reveal style={styles.formCard}>
      <Text style={[styles.formTitle, { color: themeColors.ink }]}>{isEdit ? `Request Changes: ${petName}` : 'Register My Pet'}</Text>
      <Text style={[styles.formHelp, { color: themeColors.muted }]}>
        {isEdit
          ? 'Review each section before sending changes for approval.'
          : 'A few focused steps, then the clinic can verify the profile.'}
      </Text>

      <FormProgress currentStep={step} />

      <AnimatedReveal key={step} distance={5}>
        {step === 0 ? (
          <PetFormSection first title="Pet basics" detail="Identity details used across visits and records.">
            <FormInput label="Pet name" value={form.name} onChangeText={(value) => update('name', value)} placeholder="Enter pet name" error={fieldErrors.name} />

            <ChoiceField label="Pet type" options={speciesOptions} value={form.species} onChange={(value) => update('species', value)} error={fieldErrors.species} selectedChipStyle={selectedChipStyle} selectedChipTextStyle={selectedChipTextStyle} />
            <ChoiceField label="Sex" options={sexOptions} value={form.sex} onChange={(value) => update('sex', value)} error={fieldErrors.sex} selectedChipStyle={selectedChipStyle} selectedChipTextStyle={selectedChipTextStyle} />

            <FormInput label="Breed" value={form.breed} onChangeText={(value) => update('breed', value)} placeholder="Breed or mixed breed" error={fieldErrors.breed} />
            <DateTimeField label="Birthdate" value={form.birthDate} onChange={(value) => update('birthDate', value)} maximumDate={new Date()} error={fieldErrors.birthDate} />
            <NumberStepper label="Weight" value={form.weight} onChange={(value) => update('weight', value)} max={120} error={fieldErrors.weight} />
            <FormInput label="Color / markings" value={form.color} onChangeText={(value) => update('color', value)} placeholder="Brown with white spots" error={fieldErrors.color} />
          </PetFormSection>
        ) : null}

        {step === 1 ? (
          <PetFormSection first title="Health and care" detail="Short notes help the clinic prepare before handling your pet.">
            <FormInput label="Known allergies" value={form.allergies} onChangeText={(value) => update('allergies', value)} placeholder="Write none if not applicable" error={fieldErrors.allergies} />
            <FormInput label="Emergency notes" value={form.criticalNotes} onChangeText={(value) => update('criticalNotes', value)} placeholder="Urgent handling or medical notes" multiline error={fieldErrors.criticalNotes} />
            <FormInput label="Behavior / habits / food" value={form.notes} onChangeText={(value) => update('notes', value)} placeholder="Care preferences and routines" multiline error={fieldErrors.notes} />
          </PetFormSection>
        ) : null}

        {step === 2 ? (
          <PetFormSection
            first
            title={isEdit ? 'Review changes' : 'Photo and review'}
            detail={isEdit ? 'Your current photo stays in place while the clinic reviews these details.' : 'Confirm the profile before sending it to the clinic.'}>
            <View style={[styles.photoPicker, { backgroundColor: themeColors.surfaceAlt, borderColor: fieldErrors.photo ? themeColors.danger : themeColors.line }]}> 
              <PetAvatar pet={{ name: form.name, photoUri: form.photoUri }} name={petName || form.name} size={72} />
              <View style={styles.photoCopy}>
                <Text numberOfLines={1} style={[styles.photoName, { color: themeColors.ink }]}>{form.photoName || (isEdit ? 'Current pet photo' : 'No photo selected')}</Text>
                <Text style={[styles.photoHelp, { color: themeColors.muted }]}>
                  {isEdit ? 'Pet photo changes are handled directly by the clinic.' : 'JPG, PNG, or WEBP up to 3 MB'}
                </Text>
                {!isEdit ? <AppButton compact variant="outline" icon="plus" title={form.photoAttached ? 'Change photo' : 'Choose photo'} disabled={submitting} loading={pickingPhoto} onPress={choosePhoto} style={styles.photoAction} /> : null}
              </View>
            </View>
            {fieldErrors.photo ? <Text style={[styles.fieldError, { color: themeColors.danger }]}>{fieldErrors.photo}</Text> : null}

            <View style={[styles.reviewBox, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}> 
              <ReviewRow label="Pet" value={`${form.name || 'Not entered'}${form.breed ? `, ${form.breed}` : ''}`} />
              <ReviewRow label="Profile" value={[form.species, form.sex, form.weight ? `${form.weight} kg` : ''].filter(Boolean).join(' · ') || 'Not complete'} />
              <ReviewRow label="Birthdate" value={form.birthDate || 'Not selected'} />
              <ReviewRow label="Health" value={form.allergies ? `Allergies: ${form.allergies}` : 'Not complete'} last />
            </View>
          </PetFormSection>
        ) : null}
      </AnimatedReveal>

      <ConnectionNotice error={error} onRetry={isConnectionError(error) ? submit : undefined} loading={submitting} />

      <View style={styles.formActions}>
        <AppButton variant="secondary" title={step === 0 ? 'Cancel' : 'Back'} icon={step === 0 ? 'close' : 'back'} disabled={submitting} onPress={step === 0 ? onCancel : () => setStep((current) => current - 1)} style={styles.formAction} />
        <AppButton title={step === 2 ? (isEdit ? 'Request changes' : 'Submit profile') : 'Continue'} icon={step === 2 ? 'send' : 'forward'} loading={submitting && step === 2} onPress={step === 2 ? submit : moveNext} style={styles.formActionPrimary} />
      </View>
    </AppCard>
  );
}

function FormProgress({ currentStep }) {
  const { colors: themeColors } = useTheme();
  const steps = ['Basics', 'Health', 'Review'];

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

function ChoiceField({ error, label, onChange, options, selectedChipStyle, selectedChipTextStyle, value }) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={styles.choiceField}>
      <Text style={[styles.label, { color: themeColors.ink }]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Pressable key={option} style={[styles.chip, { backgroundColor: themeColors.surface, borderColor: error ? themeColors.danger : themeColors.line }, value === option && selectedChipStyle]} onPress={() => onChange(option)}>
            <Text style={[styles.chipText, { color: themeColors.muted }, value === option && selectedChipTextStyle]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={[styles.fieldError, { color: themeColors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function ReviewRow({ label, last, value }) {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[styles.reviewRow, !last && { borderBottomColor: themeColors.line, borderBottomWidth: 1 }]}> 
      <Text style={[styles.reviewLabel, { color: themeColors.muted }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: themeColors.ink }]}>{value}</Text>
    </View>
  );
}

function PetFormSection({ children, detail, first = false, title }) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.formSection, first && styles.formSectionFirst, !first && { borderTopColor: themeColors.line, borderTopWidth: 1 }]}>
      <Text style={[styles.formSectionTitle, { color: themeColors.ink }]}>{title}</Text>
      <Text style={[styles.formSectionDetail, { color: themeColors.muted }]}>{detail}</Text>
      <View style={styles.formSectionBody}>{children}</View>
    </View>
  );
}

function normalizePet(pet) {
  return {
    ...pet,
    birthDate: pet.birthDate || '',
    criticalNotes: pet.criticalNotes || '',
    photoLabel: pet.photoLabel || '',
    photoUri: pet.photoUri || '',
    status: normalizeStatus(pet.status),
  };
}

function buildPetEditForm(pet) {
  return {
    ...emptyPetForm,
    name: pet.name || '',
    species: pet.species || '',
    breed: pet.breed || '',
    sex: pet.gender || pet.sex || '',
    birthDate: pet.birthDate || '',
    weight: stripWeightUnit(pet.weight),
    color: pet.color || '',
    allergies: pet.allergies || '',
    criticalNotes: pet.criticalNotes || '',
    notes: pet.notes || '',
    photoName: pet.photoLabel || (pet.photoUri ? 'Current pet photo' : ''),
    photoUri: pet.photoUri || '',
  };
}

function getPetEditChanges(pet, form) {
  const fields = [
    ['name', pet.name, form.name],
    ['species', pet.species, form.species],
    ['breed', pet.breed, form.breed],
    ['sex', pet.gender || pet.sex, form.sex],
    ['birthDate', pet.birthDate, form.birthDate],
    ['weight', pet.weight, form.weight],
    ['color', pet.color, form.color],
    ['allergies', pet.allergies, form.allergies],
    ['criticalNotes', pet.criticalNotes, form.criticalNotes],
    ['notes', pet.notes, form.notes],
  ];

  return fields.filter(([field, currentValue, requestedValue]) => (
    normalizePetEditValue(field, currentValue) !== normalizePetEditValue(field, requestedValue)
  ));
}

function normalizePetEditValue(field, value) {
  const clean = String(value ?? '').trim();
  if (field !== 'weight') return clean;
  const number = Number(stripWeightUnit(clean));
  return Number.isFinite(number) ? String(number) : clean;
}

function stripWeightUnit(value) {
  return String(value ?? '').replace(/\s*kg\s*$/i, '').trim();
}

function normalizeStatus(status) {
  const clean = String(status || '').toLowerCase();
  if (clean === 'approved') return 'Approved';
  if (clean === 'pending') return 'Pending';
  if (clean === 'in_person_confirmation' || clean === 'in person confirmation') return 'In Person Confirmation';
  if (clean === 'rejected') return 'Rejected';
  return status || 'Pending';
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

function validatePetStep(form, step, isEdit) {
  const errors = {};
  const required = (field, message) => {
    if (!String(form[field] || '').trim()) errors[field] = message;
  };

  if (step === 0) {
    required('name', 'Enter your pet\'s name.');
    required('species', 'Choose a pet type.');
    required('sex', 'Choose a sex.');
    required('breed', 'Enter a breed or mixed breed.');
    required('birthDate', 'Choose a birthdate.');
    required('weight', 'Enter a valid weight.');
    required('color', 'Describe the color or markings.');

    if (form.birthDate && Number.isNaN(new Date(`${form.birthDate}T12:00:00`).getTime())) errors.birthDate = 'Choose a valid birthdate.';
    if (form.birthDate && new Date(`${form.birthDate}T12:00:00`) > new Date()) errors.birthDate = 'Birthdate cannot be in the future.';
    if (form.weight && (Number(form.weight) <= 0 || Number(form.weight) > 120)) errors.weight = 'Use a weight between 0.1 and 120 kg.';
  }

  if (step === 1) {
    required('allergies', 'Write none if there are no known allergies.');
    required('criticalNotes', 'Write none if there are no emergency notes.');
    required('notes', 'Add a short care note, or write none.');
  }

  if (step === 2 && !isEdit && !form.photoAttached) errors.photo = 'Choose a clear pet photo before submitting.';
  return errors;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.screen, paddingBottom: 24 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleCopy: { flex: 1 },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontFamily: 'Manrope_800ExtraBold' },
  heroText: { color: colors.muted, fontSize: 14, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, lineHeight: 19 },
  addButton: {
    minHeight: 44,
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  disabledButton: { opacity: 0.55 },
  formCard: { marginBottom: spacing.md, backgroundColor: colors.surface },
  formTitle: { color: colors.ink, fontSize: 17, fontFamily: 'Manrope_800ExtraBold' },
  formHelp: { color: colors.muted, fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: spacing.xs, marginBottom: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingVertical: spacing.sm },
  progressItem: { flex: 1, alignItems: 'center', gap: 5 },
  progressDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressNumber: { fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  progressLabel: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  formSection: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  formSectionFirst: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  formSectionTitle: { color: colors.ink, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  formSectionDetail: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  formSectionBody: { marginTop: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontFamily: 'Manrope_700Bold', marginTop: spacing.sm, marginBottom: spacing.xs },
  choiceField: { marginTop: spacing.sm },
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
  chipText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  activeChipText: { color: colors.surface },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  photoPicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 10, padding: spacing.md },
  photoCopy: { flex: 1, minWidth: 0 },
  photoName: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  photoHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  photoAction: { alignSelf: 'flex-start', marginTop: spacing.sm },
  fieldError: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, marginTop: 4 },
  reviewBox: { borderWidth: 1, borderRadius: 10, marginTop: spacing.md, paddingHorizontal: spacing.md },
  reviewRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingVertical: spacing.sm },
  reviewLabel: { width: 64, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  reviewValue: { flex: 1, textAlign: 'right', fontFamily: 'Manrope_700Bold', fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: 'Manrope_700Bold', marginTop: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  formAction: { flex: 1 },
  formActionPrimary: { flex: 1.35 },
  filterSection: { marginBottom: spacing.md },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterTitle: { color: colors.ink, fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  filterSummary: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  filterChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { color: colors.inkSoft, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_700Bold' },
  filterCount: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 5,
  },
  filterCountText: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  requestsCard: { marginBottom: spacing.md },
  requestsToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestsTitle: { color: colors.ink, fontSize: 17, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.sm },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  requestCopy: { flex: 1 },
  requestPet: { color: colors.ink, fontFamily: 'Manrope_800ExtraBold' },
  requestFields: { color: colors.muted, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  requestAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  requestItemPressed: { opacity: 0.68 },
});
