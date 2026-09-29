import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi } from '@/api/endpoints';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/auth/token';

interface AdminAuthContextValue {
  token: string | null;
  admin: { id: string; email: string } | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [admin, setAdmin] = useState<{ id: string; email: string } | null>(null);
  const [ready, setReady] = useState(!getAuthToken());

  // Validate an existing token on mount.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    adminApi
      .me()
      .then(({ admin }) => {
        if (!cancelled) {
          setAdmin(admin);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthToken();
          setToken(null);
          setAdmin(null);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Global 401 handler wired by the API client.
  useEffect(() => {
    const onLogout = () => {
      clearAuthToken();
      setToken(null);
      setAdmin(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      token,
      admin,
      ready,
      async login(email, password) {
        const { token: newToken, admin: me } = await adminApi.login(email, password);
        setAuthToken(newToken);
        setToken(newToken);
        setAdmin(me);
      },
      logout() {
        clearAuthToken();
        setToken(null);
        setAdmin(null);
      },
    }),
    [token, admin, ready]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
