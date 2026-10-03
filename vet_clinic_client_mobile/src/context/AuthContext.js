import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchCurrentUser,
  loginClient,
  normalizeAuthUser,
  registerClient,
  revokeCurrentToken,
  updateRemoteProfile,
  verifyClientOtp,
} from '../api/authApi';
import { ApiError, clearApiSession, setApiToken, setUnauthorizedHandler } from '../api/apiClient';
import { getStoredToken, setStoredToken } from '../api/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const clientRef = useRef(null);

  const applyClient = useCallback((nextClient) => {
    clientRef.current = nextClient;
    setClient(nextClient);
  }, []);

  useEffect(() => {
    let active = true;
    const removeUnauthorizedHandler = setUnauthorizedHandler(() => {
      if (active) applyClient(null);
    });

    async function restoreSession() {
      try {
        const token = await getStoredToken();
        if (!token) return;

        setApiToken(token);
        const restoredClient = await fetchCurrentUser();
        if (active) applyClient(restoredClient);
      } catch (error) {
        if (active) setRestoreError(error);
      } finally {
        if (active) setIsRestoring(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
      removeUnauthorizedHandler();
    };
  }, [applyClient]);

  const login = useCallback(async ({ email, password }) => {
    setRestoreError(null);
    const session = await loginClient({ email, password });

    try {
      await setStoredToken(session.token);
    } catch (error) {
      setApiToken(session.token);
      await revokeCurrentToken().catch(() => null);
      await clearApiSession();
      throw new ApiError('Vetrix could not securely save this session. Please try again.', {
        code: 'TOKEN_STORAGE_FAILED',
        cause: error,
      });
    }

    setApiToken(session.token);
    applyClient(session.user);
    return session.user;
  }, [applyClient]);

  const signup = useCallback((details) => registerClient(details), []);
  const verifyOtp = useCallback((details) => verifyClientOtp(details), []);

  const logout = useCallback(async () => {
    let revocationError = null;

    try {
      await revokeCurrentToken();
    } catch (error) {
      revocationError = error;
    } finally {
      await clearApiSession();
      applyClient(null);
    }

    return { revoked: !revocationError, error: revocationError };
  }, [applyClient]);

  const updateProfile = useCallback(async (updates) => {
    setProfileError(null);

    try {
      const remoteClient = await updateRemoteProfile(updates);
      const nextClient = mergeClientProfile(clientRef.current, remoteClient || updates);
      applyClient(nextClient);
      return { ok: true, user: nextClient };
    } catch (error) {
      setProfileError(error);
      return { ok: false, error, user: clientRef.current };
    }
  }, [applyClient]);

  const value = useMemo(
    () => ({
      client,
      isRestoring,
      isSignedIn: Boolean(client),
      login,
      logout,
      profileError,
      register: signup,
      restoreError,
      signup,
      updateProfile,
      verifyOtp,
    }),
    [client, isRestoring, login, logout, profileError, restoreError, signup, updateProfile, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

function mergeClientProfile(current, updates) {
  const merged = {
    ...(current || {}),
    ...(updates || {}),
  };
  return normalizeAuthUser(merged);
}
