import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'vetrix.preferences.nightMode';

export async function getStoredNightMode() {
  return (await SecureStore.getItemAsync(THEME_KEY)) === 'true';
}

export async function setStoredNightMode(enabled) {
  await SecureStore.setItemAsync(THEME_KEY, String(enabled));
}
