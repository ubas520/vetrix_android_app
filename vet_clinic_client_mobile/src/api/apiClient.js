import { buildApiUrl } from './config';
import { clearStoredToken } from './tokenStorage';

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

let accessToken = null;
let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.code = options.code || 'API_ERROR';
    this.fieldErrors = options.fieldErrors || {};
    this.details = options.details || null;
    if (options.cause) this.cause = options.cause;
  }
}

export function setApiToken(token) {
  accessToken = typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export async function clearApiSession() {
  accessToken = null;

  try {
    await clearStoredToken();
  } catch {
    // The in-memory credential is still removed. A later launch will retry
    // validation through me.php before treating any stored token as signed in.
  }

  try {
    unauthorizedHandler?.();
  } catch {
    // Authentication cleanup must not be blocked by a UI callback.
  }
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    body,
    headers = {},
    method = body === undefined ? 'GET' : 'POST',
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...fetchOptions
  } = options;
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (auth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  let requestBody;
  if (body !== undefined) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const isStringBody = typeof body === 'string';
    requestBody = isFormData || isStringBody ? body : JSON.stringify(body);

    if (!isFormData && !hasHeader(requestHeaders, 'content-type')) {
      requestHeaders['Content-Type'] = 'application/json';
    }
  }

  const requestController = typeof AbortController === 'function' ? new AbortController() : null;
  const requestTimeoutMs = Number(timeoutMs);
  const timeoutId = requestController
    && Number.isFinite(requestTimeoutMs)
    && requestTimeoutMs > 0
    ? setTimeout(() => requestController.abort(), requestTimeoutMs)
    : null;

  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...fetchOptions,
      method,
      headers: requestHeaders,
      body: requestBody,
      ...(requestController ? { signal: requestController.signal } : {}),
    });
  } catch (error) {
    const didTimeOut = Boolean(requestController?.signal.aborted);
    throw new ApiError(didTimeOut
      ? 'Vetrix is taking too long to respond. Please try again.'
      : 'Unable to connect to Vetrix. Check your connection and try again.', {
      code: didTimeOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      cause: error,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const payload = await readPayload(response);
  const reportsFailure = payload && typeof payload === 'object'
    && (payload.ok === false || payload.success === false);

  if (!response.ok || reportsFailure) {
    if (response.status === 401) await clearApiSession();

    throw new ApiError(getErrorMessage(payload, response.status), {
      status: response.status,
      code: getErrorCode(payload, response.status),
      fieldErrors: getFieldErrors(payload),
      details: payload,
    });
  }

  return payload;
}

function hasHeader(headers, expectedName) {
  return Object.keys(headers).some((name) => name.toLowerCase() === expectedName);
}

async function readPayload(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      code: 'INVALID_RESPONSE',
      message: response.status === 404
        ? 'This feature is unavailable on the clinic server. Please contact the clinic to update it.'
        : 'The clinic server returned an unexpected response. Please try again later.',
    };
  }
}

function getErrorMessage(payload, status) {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) return payload.error.message;
  if (status === 401) return 'Your Vetrix session is no longer valid. Sign in again.';
  if (status === 403) return 'Your account is not allowed to perform this action.';
  if (status === 422) return 'Please review the information and try again.';
  if (status >= 500) return 'Vetrix could not complete the request. Try again shortly.';
  return 'The request could not be completed.';
}

function getErrorCode(payload, status) {
  return payload?.code
    || payload?.error?.code
    || (status ? `HTTP_${status}` : 'API_ERROR');
}

function getFieldErrors(payload) {
  const candidate = payload?.fieldErrors
    || payload?.field_errors
    || payload?.errors
    || payload?.error?.fields;
  return candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
}
