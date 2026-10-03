import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  cancelAppointment as cancelClientAppointment,
  createAppointment as createClientAppointment,
  createPet as createClientPet,
  createPetEditRequest as createClientPetEditRequest,
  getClientBootstrap,
  getProductOrders,
  rateAppointment as rateClientAppointment,
  markAllNotificationsRead as markAllClientNotificationsRead,
  markNotificationRead as markClientNotificationRead,
} from '../api/clientApi';
import { useAuth } from './AuthContext';

const ClientDataContext = createContext(null);

const emptyData = {
  profile: null,
  pets: [],
  appointments: [],
  medicalRecords: [],
  vaccinationRecords: [],
  products: [],
  orders: [],
  paymentOptions: { clinic: true, gcash: { enabled: false } },
  notifications: [],
  editRequests: [],
};

export function ClientDataProvider({ children }) {
  const { client, isSignedIn } = useAuth();
  const [data, setData] = useState(emptyData);
  const [dataOwnerKey, setDataOwnerKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const ownerKey = client?.id === null || client?.id === undefined ? null : String(client.id);
  const ownerRef = useRef(ownerKey);
  useEffect(() => { ownerRef.current = ownerKey; return () => { ownerRef.current = null; }; }, [ownerKey]);
  const [cartState, setCartState] = useState({ owner: null, quantities: {} });
  const cart = useMemo(() => cartState.owner === ownerKey ? cartState.quantities : {}, [cartState, ownerKey]);
  const updateCart = useCallback((id, quantity) => {
    setCartState((current) => {
      const quantities = { ...(current.owner === ownerKey ? current.quantities : {}) };
      if (quantity > 0) quantities[id] = Math.min(99, Math.floor(quantity));
      else delete quantities[id];
      return { owner: ownerKey, quantities };
    });
  }, [ownerKey]);
  const clearCart = useCallback(() => setCartState({ owner: ownerKey, quantities: {} }), [ownerKey]);
  const refreshOrders = useCallback(async () => {
    const response = await getProductOrders();
    const payload = unwrapData(response);
    if (ownerRef.current === ownerKey) setData((current) => ({ ...current, orders: arrayOf(payload.orders), paymentOptions: payload.payment_options || current.paymentOptions }));
    return payload;
  }, [ownerKey]);
  const rememberOrder = useCallback((order) => {
    if (ownerRef.current === ownerKey && order) setData((current) => ({ ...current, orders: mergeById(current.orders, order) }));
  }, [ownerKey]);

  const loadBootstrap = useCallback(async ({ refresh = false } = {}) => {
    if (!isSignedIn || !ownerKey) {
      return null;
    }

    const requestedOwnerKey = ownerKey;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError('');
    if (refresh) setRefreshing(true);
    else {
      setData(emptyData);
      setDataOwnerKey(null);
      setLoading(true);
    }

    try {
      const response = await getClientBootstrap();
      const nextData = normalizeBootstrap(response);
      if (requestId === requestIdRef.current) {
        setData(nextData);
        setDataOwnerKey(requestedOwnerKey);
      }
      return nextData;
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(getErrorMessage(loadError, 'Vetrix could not load your clinic data.'));
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isSignedIn, ownerKey]);

  useEffect(() => {
    if (!isSignedIn || !ownerKey) {
      requestIdRef.current += 1;
      const resetRequest = setTimeout(() => {
        setCartState({ owner: null, quantities: {} });
        setData(emptyData);
        setDataOwnerKey(null);
        setError('');
        setLoading(false);
        setRefreshing(false);
      }, 0);
      return () => clearTimeout(resetRequest);
    }

    const startRequest = setTimeout(() => {
      void loadBootstrap();
    }, 0);
    return () => {
      clearTimeout(startRequest);
      requestIdRef.current += 1;
    };
  }, [isSignedIn, loadBootstrap, ownerKey]);

  const refresh = useCallback(() => loadBootstrap({ refresh: true }), [loadBootstrap]);

  const createPet = useCallback(async (values) => {
    setError('');
    try {
      const response = await createClientPet(values);
      const pet = normalizePet(extractEntity(response, 'pet'));

      if (pet) {
        setData((current) => ({
          ...current,
          pets: mergeById(current.pets, pet),
        }));
      } else {
        await loadBootstrap({ refresh: true });
      }

      return pet;
    } catch (mutationError) {
      const message = getErrorMessage(mutationError, 'The pet profile could not be submitted.');
      throw mutationErrorWithMessage(mutationError, message);
    }
  }, [loadBootstrap]);

  const createPetEditRequest = useCallback(async (values) => {
    setError('');
    try {
      const response = await createClientPetEditRequest(values);
      const payload = unwrapData(response);
      const requests = normalizeEditRequests(payload.editRequests || payload.edit_requests);

      if (requests.length) {
        setData((current) => ({
          ...current,
          editRequests: mergeManyById(current.editRequests, requests),
        }));
      } else {
        await loadBootstrap({ refresh: true });
      }

      return requests;
    } catch (mutationError) {
      const message = getErrorMessage(mutationError, 'The pet changes could not be submitted.');
      throw mutationErrorWithMessage(mutationError, message);
    }
  }, [loadBootstrap]);

  const createAppointment = useCallback(async (values) => {
    setError('');
    try {
      const response = await createClientAppointment(values);
      const appointment = normalizeAppointment(extractEntity(response, 'appointment'));

      if (appointment) {
        setData((current) => ({
          ...current,
          appointments: mergeById(current.appointments, appointment),
        }));
      } else {
        await loadBootstrap({ refresh: true });
      }

      return appointment;
    } catch (mutationError) {
      const message = getErrorMessage(mutationError, 'The appointment request could not be sent.');
      throw mutationErrorWithMessage(mutationError, message);
    }
  }, [loadBootstrap]);

  const cancelAppointment = useCallback(async (appointmentId) => {
    setError('');
    try {
      const response = await cancelClientAppointment(appointmentId);
      const returnedAppointment = normalizeAppointment(extractEntity(response, 'appointment'));

      setData((current) => ({
        ...current,
        appointments: current.appointments.map((appointment) => {
          if (String(appointment.id) !== String(appointmentId)) return appointment;
          return returnedAppointment || { ...appointment, status: 'Cancelled' };
        }),
      }));

      return returnedAppointment;
    } catch (mutationError) {
      const message = getErrorMessage(mutationError, 'The appointment could not be cancelled.');
      throw mutationErrorWithMessage(mutationError, message);
    }
  }, []);

  const rateAppointment = useCallback(async (appointmentId, rating, comment) => {
    const response = await rateClientAppointment(appointmentId, rating, comment);
    const feedback = extractEntity(response, 'feedback');
    if (!feedback?.id) throw new Error('Your rating could not be confirmed. Please try again.');
    if (ownerRef.current === ownerKey) {
      setData((current) => ({
        ...current,
        appointments: current.appointments.map((appointment) =>
          String(appointment.id) === String(appointmentId) ? { ...appointment, feedback } : appointment),
      }));
    }
    return feedback;
  }, [ownerKey]);

  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      await markClientNotificationRead(notificationId);
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((notification) =>
          String(notification.id) === String(notificationId)
            ? { ...notification, status: 'Read' }
            : notification),
      }));
      return true;
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, 'The notification could not be updated.'));
      return false;
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await markAllClientNotificationsRead();
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({ ...notification, status: 'Read' })),
      }));
      return true;
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, 'Notifications could not be updated.'));
      return false;
    }
  }, []);

  const hasCurrentOwnerData = isSignedIn && ownerKey !== null && dataOwnerKey === ownerKey;
  const value = useMemo(() => ({
    ...(hasCurrentOwnerData ? data : emptyData),
    loading: isSignedIn ? loading : false,
    refreshing: isSignedIn ? refreshing : false,
    error: isSignedIn ? error : '',
    refresh,
    cart,
    updateCart,
    clearCart,
    refreshOrders,
    rememberOrder,
    createPet,
    createPetEditRequest,
    createAppointment,
    cancelAppointment,
    rateAppointment,
    markNotificationRead,
    markAllNotificationsRead,
  }), [
    cart,
    updateCart,
    clearCart,
    refreshOrders,
    rememberOrder,
    cancelAppointment,
    rateAppointment,
    createAppointment,
    createPet,
    createPetEditRequest,
    data,
    error,
    hasCurrentOwnerData,
    isSignedIn,
    loading,
    markAllNotificationsRead,
    markNotificationRead,
    refresh,
    refreshing,
  ]);

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error('useClientData must be used inside ClientDataProvider');
  return context;
}

function normalizeBootstrap(response) {
  const payload = unwrapData(response);
  const qrTokens = arrayOf(payload.qrTokens || payload.qr_tokens);
  const tokenByPetId = new Map(qrTokens.map((item) => [String(item.petId ?? item.pet_id), item.token]));

  return {
    profile: normalizeProfile(payload.profile || payload.client || payload.user),
    pets: arrayOf(payload.pets).map((pet) => normalizePet(pet, tokenByPetId)),
    appointments: arrayOf(payload.appointments).map(normalizeAppointment).filter(Boolean),
    medicalRecords: arrayOf(payload.medicalRecords || payload.medical_records).map(normalizeMedicalRecord),
    vaccinationRecords: arrayOf(payload.vaccinationRecords || payload.vaccination_records).map(normalizeVaccinationRecord),
    products: arrayOf(payload.products).map(normalizeProduct),
    orders: arrayOf(payload.orders),
    paymentOptions: payload.payment_options || emptyData.paymentOptions,
    notifications: arrayOf(payload.notifications).map(normalizeNotification),
    editRequests: normalizeEditRequests(payload.editRequests || payload.edit_requests),
  };
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const name = profile.name || profile.fullName || profile.full_name || '';
  return {
    ...profile,
    id: normalizeId(profile.id),
    name,
    firstName: profile.firstName || profile.first_name || name.trim().split(/\s+/)[0] || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    memberSince: profile.memberSince || profile.member_since || profile.createdAt || profile.created_at || '',
  };
}

function normalizePet(pet, tokenByPetId = new Map()) {
  const id = normalizeId(pet.id);
  const birthDate = pet.birthDate || pet.birth_date || '';
  const weightValue = pet.weight;
  const weight = weightValue === null || weightValue === undefined || weightValue === ''
    ? ''
    : /kg$/i.test(String(weightValue).trim()) ? String(weightValue) : `${weightValue} kg`;

  return {
    ...pet,
    id,
    ownerId: normalizeId(pet.ownerId ?? pet.owner_id),
    birthDate,
    age: pet.age || formatAge(birthDate),
    registeredDate: pet.registeredDate || pet.registered_date || pet.createdAt || pet.created_at || '',
    gender: pet.gender || pet.sex || '',
    status: titleCaseStatus(pet.status || pet.verificationStatus || pet.verification_status),
    verificationNotes: pet.verificationNotes || pet.verification_notes || '',
    weight,
    criticalNotes: pet.criticalNotes || pet.critical_notes || '',
    notes: pet.notes || '',
    allergies: pet.allergies || '',
    color: pet.color || '',
    photoUri: pet.photoUri || pet.photo_uri || pet.petPhotoUrl || pet.pet_photo_url || pet.pet_photo || '',
    photoLabel: pet.photoLabel || pet.photo_label || '',
    qrToken: pet.qrToken || pet.qr_token || tokenByPetId.get(String(id)) || '',
  };
}

function normalizeAppointment(appointment) {
  if (!appointment || typeof appointment !== 'object') return null;
  const requestedDateTime = appointment.requestedDateTime || appointment.requested_date_time || appointment.requestedDate || appointment.requested_date || '';
  const scheduledDateTime = appointment.scheduledDateTime || appointment.scheduled_date_time || appointment.scheduledDate || appointment.scheduled_date || '';
  const displayDateTime = scheduledDateTime || requestedDateTime;

  return {
    ...appointment,
    id: normalizeId(appointment.id),
    petId: normalizeId(appointment.petId ?? appointment.pet_id),
    petName: appointment.petName || appointment.pet_name || '',
    requestedDateTime,
    scheduledDateTime,
    date: appointment.date || String(displayDateTime).slice(0, 10),
    time: appointment.time || formatTime(displayDateTime),
    serviceType: appointment.serviceType || appointment.service_type || appointment.service || 'Clinic Visit',
    service: appointment.service || appointment.serviceType || appointment.service_type || 'Clinic Visit',
    status: titleCaseStatus(appointment.status),
    assignedVet: appointment.assignedVet || appointment.assigned_vet || appointment.vetName || appointment.vet_name || 'To be assigned',
    concern: appointment.concern || appointment.reason || '',
    clinicNote: appointment.clinicNote || appointment.clinic_note || appointment.adminNotes || appointment.admin_notes || '',
  };
}

function normalizeMedicalRecord(record) {
  return {
    ...record,
    id: normalizeId(record.id),
    petId: normalizeId(record.petId ?? record.pet_id),
    petName: record.petName || record.pet_name || '',
    recordDate: record.recordDate || record.record_date || record.visitDate || record.visit_date || '',
    consultation: record.consultation || record.symptoms || '',
    vetName: record.vetName || record.vet_name || record.veterinarian || '',
    vetRemarks: record.vetRemarks || record.vet_remarks || record.notes || '',
  };
}

function normalizeVaccinationRecord(record) {
  return {
    ...record,
    id: normalizeId(record.id),
    petId: normalizeId(record.petId ?? record.pet_id),
    petName: record.petName || record.pet_name || '',
    vaccineName: record.vaccineName || record.vaccine_name || '',
    dateGiven: record.dateGiven || record.date_given || '',
    nextDueDate: record.nextDueDate || record.next_due_date || '',
    vetName: record.vetName || record.vet_name || record.administeredBy || record.administered_by || '',
  };
}

function normalizeProduct(product) {
  const price = Number(product.price ?? product.salePrice ?? product.sale_price ?? 0);
  return {
    ...product,
    id: normalizeId(product.id),
    name: product.name || product.itemName || product.item_name || '',
    sku: product.sku || '',
    category: product.category || 'Uncategorized',
    price: Number.isFinite(price) ? price : 0,
    currency: product.currency || 'PHP',
    unit: product.unit || 'item',
    stockQty: Number(product.stockQty ?? product.stock_qty ?? 0),
    reorderLevel: Number(product.reorderLevel ?? product.reorder_level ?? 0),
    status: String(product.status || 'available').toLowerCase(),
    photoUrl: product.photoUrl || product.product_photo_url || '',
    updatedAt: product.updatedAt || product.updated_at || null,
  };
}

function normalizeNotification(notification) {
  return {
    ...notification,
    id: normalizeId(notification.id),
    type: titleCaseStatus(notification.type || 'system'),
    status: titleCaseStatus(notification.status || 'unread'),
    createdAt: notification.createdAt || notification.created_at || '',
  };
}

function normalizeEditRequests(requests) {
  const normalized = arrayOf(requests).map((request) => ({
    ...request,
    id: normalizeId(request.id),
    petId: normalizeId(request.petId ?? request.pet_id),
    petName: request.petName || request.pet_name || '',
    status: titleCaseStatus(request.status),
    submittedAt: request.submittedAt || request.submitted_at || request.createdAt || request.created_at || '',
    reviewedAt: request.reviewedAt || request.reviewed_at || '',
    adminNotes: request.adminNotes || request.admin_notes || '',
    changes: arrayOf(request.changes).map((change) => ({
      ...change,
      field: change.field || change.field_name || '',
      label: change.label || petEditFieldLabel(change.field || change.field_name),
      currentDisplayValue: change.currentDisplayValue || change.current_display_value || change.oldValue || change.old_value || 'Not set',
      requestedDisplayValue: change.requestedDisplayValue || change.requested_display_value || change.newValue || change.new_value || 'Not set',
    })),
  }));

  return normalized.map((request) => {
    if (request.changes.length) return request;
    const field = request.fieldName || request.field_name;
    if (!field) return request;
    return {
      ...request,
      changes: [{
        field,
        label: petEditFieldLabel(field),
        currentDisplayValue: request.oldValue || request.old_value || 'Not set',
        requestedDisplayValue: request.newValue || request.new_value || 'Not set',
      }],
    };
  });
}

function unwrapData(response) {
  if (!response || typeof response !== 'object') return {};
  if (response.data && typeof response.data === 'object') return response.data;
  return response;
}

function extractEntity(response, key) {
  const payload = unwrapData(response);
  return payload[key] || (response && response[key]) || null;
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return value;
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function titleCaseStatus(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function humanize(value) {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Pet detail';
}

function petEditFieldLabel(field) {
  const labels = {
    name: 'Pet Name',
    species: 'Pet Type',
    breed: 'Breed',
    sex: 'Sex',
    birth_date: 'Birthdate',
    weight: 'Weight',
    color: 'Color / Markings',
    allergies: 'Known Allergies',
    critical_notes: 'Emergency Notes',
    notes: 'Behavior / Habits / Food',
  };
  return labels[field] || humanize(field);
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAge(value) {
  if (!value) return '';
  const birthDate = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) years -= 1;
  if (years < 1) return 'Less than 1 year';
  return `${years} year${years === 1 ? '' : 's'}`;
}

function mergeById(items, item) {
  const withoutMatch = items.filter((current) => String(current.id) !== String(item.id));
  return [item, ...withoutMatch];
}

function mergeManyById(items, newItems) {
  const newIds = new Set(newItems.map((item) => String(item.id)));
  return [...newItems, ...items.filter((item) => !newIds.has(String(item.id)))];
}

function getErrorMessage(error, fallback) {
  return error?.message || error?.data?.message || fallback;
}

function mutationErrorWithMessage(error, message) {
  if (error instanceof Error) {
    if (!error.message) error.message = message;
    return error;
  }
  return new Error(message);
}
