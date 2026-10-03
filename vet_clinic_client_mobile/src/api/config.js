import { Platform } from 'react-native';

const MOBILE_API_PATH = '/api/mobile/v1';

function getWebDevelopmentUrl() {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return `http://localhost/vetrix${MOBILE_API_PATH}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}/vetrix${MOBILE_API_PATH}`;
}

const platformDefaultUrl = Platform.select({
  android: `http://10.0.2.2/vetrix${MOBILE_API_PATH}`,
  ios: `http://localhost/vetrix${MOBILE_API_PATH}`,
  web: getWebDevelopmentUrl(),
  default: `http://localhost/vetrix${MOBILE_API_PATH}`,
});

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

// Expo replaces this direct dot-notation reference when it bundles the app.
// EXPO_PUBLIC values are public and must never contain a password or API token.
const configuredApiUrl = process.env.EXPO_PUBLIC_VETRIX_API_URL;

export const VETRIX_API_URL = normalizeBaseUrl(configuredApiUrl || platformDefaultUrl);

function deriveWebsiteUrl(apiUrl) {
  const normalized = normalizeBaseUrl(apiUrl);
  const markerIndex = normalized.toLowerCase().lastIndexOf(MOBILE_API_PATH);
  return markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized;
}

export const VETRIX_WEBSITE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_VETRIX_WEBSITE_URL || deriveWebsiteUrl(VETRIX_API_URL),
);

export function buildApiUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return VETRIX_API_URL;
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${VETRIX_API_URL}/${normalizedPath.replace(/^\/+/, '')}`;
}

export function buildWebsiteUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return VETRIX_WEBSITE_URL;
  if (/^[a-z][a-z\d+.-]*:/i.test(normalizedPath)) return normalizedPath;

  if (normalizedPath.startsWith('//')) {
    const protocol = VETRIX_WEBSITE_URL.startsWith('https://') ? 'https:' : 'http:';
    return `${protocol}${normalizedPath}`;
  }

  if (normalizedPath.startsWith('/')) {
    const originMatch = VETRIX_WEBSITE_URL.match(/^(https?:\/\/[^/]+)/i);
    return originMatch ? `${originMatch[1]}${normalizedPath}` : normalizedPath;
  }

  return `${VETRIX_WEBSITE_URL}/${normalizedPath.replace(/^\/+/, '')}`;
}

export const buildMediaUrl = buildWebsiteUrl;
