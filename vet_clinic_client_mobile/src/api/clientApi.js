import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { apiRequest } from './apiClient';

export function getClientBootstrap() {
  return apiRequest('bootstrap.php');
}

export function getProductOrders() {
  return apiRequest('orders.php');
}

export function createProductOrder(values) {
  return apiRequest('orders.php', { method: 'POST', body: values });
}

export function cancelProductOrder(id) {
  return apiRequest('orders.php', { method: 'POST', body: { action: 'cancel', id } });
}

export function submitOrderProof(id, reference, asset) {
  const body = new FormData();
  body.append('action', 'proof');
  body.append('id', String(id));
  body.append('reference', reference);
  if (Platform.OS === 'web' && asset.file) body.append('proof', asset.file, asset.file.name || 'payment-proof.jpg');
  else if (Platform.OS !== 'web') {
    const photo = new File(asset.uri);
    if (!photo.exists) throw new Error('The payment screenshot is no longer available. Choose it again.');
    body.append('proof', photo);
  } else throw new Error('Choose your payment screenshot again.');
  return apiRequest('orders.php', { method: 'POST', body, timeoutMs: 60000 });
}

export function createPet(values = {}) {
  const body = new FormData();
  const fields = {
    name: values.name,
    species: values.species,
    breed: values.breed,
    sex: values.sex,
    birth_date: values.birthDate ?? values.birth_date,
    weight: values.weight,
    color: values.color,
    allergies: values.allergies,
    critical_notes: values.criticalNotes ?? values.critical_notes,
    notes: values.notes,
  };

  Object.entries(fields).forEach(([key, value]) => {
    body.append(key, String(value ?? '').trim());
  });

  const photoName = values.photoName || values.photoFile?.name || 'pet-photo.jpg';
  if (values.photoFile) {
    body.append('pet_photo', values.photoFile, photoName);
  } else if (values.photoUri && Platform.OS !== 'web') {
    const photo = new File(values.photoUri);
    if (!photo.exists) {
      throw new Error('The selected pet photo is no longer available. Choose it again.');
    }
    body.append('pet_photo', photo);
  }

  return apiRequest('pets.php', {
    method: 'POST',
    body,
  });
}

export function createPetEditRequest(values = {}) {
  return apiRequest('pet_edit_requests.php', {
    method: 'POST',
    body: {
      pet_id: values.petId ?? values.pet_id,
      name: values.name,
      species: values.species,
      breed: values.breed,
      sex: values.sex,
      birth_date: values.birthDate ?? values.birth_date,
      weight: values.weight,
      color: values.color,
      allergies: values.allergies,
      critical_notes: values.criticalNotes ?? values.critical_notes,
      notes: values.notes,
    },
  });
}

export function createAppointment(values = {}) {
  const requestedDateTime = values.requestedDateTime
    || values.requestedDate
    || values.requested_date
    || values.requested_date_time;

  return apiRequest('appointments.php', {
    method: 'POST',
    body: {
      pet_id: values.petId ?? values.pet_id,
      service_type: values.serviceType ?? values.service_type ?? values.service,
      concern: values.concern ?? values.reason,
      requested_date: requestedDateTime,
    },
  });
}

export function cancelAppointment(appointmentId) {
  return apiRequest('appointments.php', {
    method: 'PATCH',
    body: {
      action: 'cancel',
      id: appointmentId,
    },
  });
}

export function rateAppointment(appointmentId, rating, comment) {
  return apiRequest('feedback.php', {
    method: 'POST',
    body: { appointment_id: Number(appointmentId), rating, comment },
  });
}

export function markNotificationRead(notificationId) {
  return apiRequest('notifications.php', {
    method: 'POST',
    body: {
      action: 'mark_read',
      id: notificationId,
    },
  });
}

export function markAllNotificationsRead() {
  return apiRequest('notifications.php', {
    method: 'POST',
    body: { action: 'mark_all' },
  });
}
