const THEME_KEY = 'vetrix.preferences.nightMode';

export async function getStoredNightMode() {
  return typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY) === 'true';
}

export async function setStoredNightMode(enabled) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, String(enabled));
  }
}
