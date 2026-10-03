export function isConnectionError(error) {
  return ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error?.code) || error?.status >= 500;
}

export function getScreenFieldErrors(error, aliases = {}) {
  const fieldErrors = error?.fieldErrors;
  if (!fieldErrors || Array.isArray(fieldErrors) || typeof fieldErrors !== 'object') return {};

  return Object.entries(fieldErrors).reduce((result, [field, value]) => {
    const targetField = aliases[field] || field;
    const message = Array.isArray(value) ? value.find(Boolean) : value;
    if (typeof message === 'string' && message.trim()) result[targetField] = message.trim();
    return result;
  }, {});
}

export function getScreenErrorMessage(error, fallback) {
  return typeof error?.message === 'string' && error.message.trim() ? error.message : fallback;
}
