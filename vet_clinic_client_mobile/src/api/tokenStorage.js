import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'vetrix.auth.token';

export function getStoredToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export function setStoredToken(token) {
  return SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  return SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
