const AUTH_TOKEN_KEY = 'vetrix.auth.token';

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export async function getStoredToken() {
  return getSessionStorage()?.getItem(AUTH_TOKEN_KEY) || null;
}

export async function setStoredToken(token) {
  const storage = getSessionStorage();
  if (!storage) throw new Error('Browser session storage is unavailable.');
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearStoredToken() {
  getSessionStorage()?.removeItem(AUTH_TOKEN_KEY);
}
