import { ApiError, apiRequest } from './apiClient';
import { buildMediaUrl } from './config';

export async function loginClient({ email, password }) {
  const payload = await apiRequest('login.php', {
    auth: false,
    method: 'POST',
    body: { email, password },
  });
  const token = findToken(payload);
  const user = normalizeAuthUser(findUser(payload));

  if (!token || !user) {
    throw invalidResponseError('Vetrix returned an incomplete login response.');
  }

  return { token, user, message: findMessage(payload) };
}

export async function fetchCurrentUser() {
  const payload = await apiRequest('me.php');
  const user = normalizeAuthUser(findUser(payload));
  if (!user) throw invalidResponseError('Vetrix could not restore this account.');
  return user;
}

export async function registerClient({ email, name, password, phone }) {
  const payload = await apiRequest('register.php', {
    auth: false,
    method: 'POST',
    body: { email, name, password, phone },
  });

  return {
    message: findMessage(payload),
    status: payload?.status || payload?.data?.status || 'pending',
  };
}

export async function verifyClientOtp({ email, otp }) {
  const payload = await apiRequest('verify_otp.php', {
    auth: false,
    method: 'POST',
    body: { email, otp },
  });

  return {
    message: findMessage(payload),
    status: payload?.status || payload?.data?.status || 'verified',
  };
}

export function revokeCurrentToken() {
  return apiRequest('logout.php', { method: 'POST', body: {} });
}

export function requestPasswordReset(email) {
  return apiRequest('password_reset.php', { auth: false, method: 'POST', body: { action: 'request', email } });
}

export function resetClientPassword({ email, otp, password, confirmPassword }) {
  return apiRequest('password_reset.php', { auth: false, method: 'POST', body: { action: 'reset', email, otp, password, confirmPassword } });
}

export async function updateRemoteProfile(updates) {
  const payload = await apiRequest('profile.php', {
    method: 'PATCH',
    body: updates,
  });
  return normalizeAuthUser(findUser(payload));
}

export function normalizeAuthUser(user) {
  if (!user || typeof user !== 'object') return null;

  const name = String(user.name || user.fullName || user.full_name || '').trim();
  const firstName = String(user.firstName || user.first_name || name.split(/\s+/)[0] || '').trim();
  const profilePhoto = user.profilePhoto || user.profile_photo || null;

  return {
    ...user,
    id: user.id ?? user.userId ?? user.user_id,
    name,
    firstName,
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    memberSince: user.memberSince || user.member_since || user.createdAt || user.created_at || '',
    profilePhoto,
    profilePhotoUrl: profilePhoto ? buildMediaUrl(profilePhoto) : null,
  };
}

function findToken(payload) {
  return payload?.token
    || payload?.accessToken
    || payload?.access_token
    || payload?.data?.token
    || payload?.data?.accessToken
    || payload?.data?.access_token
    || null;
}

function findUser(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.user || payload.client || payload.profile) {
    return payload.user || payload.client || payload.profile;
  }
  if (payload.data?.user || payload.data?.client || payload.data?.profile) {
    return payload.data.user || payload.data.client || payload.data.profile;
  }
  if (payload.data && typeof payload.data === 'object' && payload.data.id) return payload.data;
  return null;
}

function findMessage(payload) {
  return typeof payload?.message === 'string' ? payload.message : '';
}

function invalidResponseError(message) {
  return new ApiError(message, { code: 'INVALID_RESPONSE' });
}
