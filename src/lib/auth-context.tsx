'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { CurrentUser, api, apiRequest, setAccessToken } from './api';

interface LoginResponse { user: CurrentUser; accessToken: string; expiresIn: number }

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  // The access token lives only in sessionStorage and does not survive a new
  // tab; the refresh cookie does, so a silent refresh restores the session
  // rather than bouncing a signed-in user back to the login page.
  React.useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const me = await api.get<CurrentUser>('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        try {
          const refreshed = await apiRequest<{ accessToken: string }>('/auth/refresh', {
            method: 'POST', body: {}, skipRefresh: true,
          });
          setAccessToken(refreshed.accessToken);
          const me = await api.get<CurrentUser>('/auth/me');
          if (!cancelled) setUser(me);
        } catch {
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResponse>('/auth/login', { email, password, platform: 'web' });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Cleared locally even if the server call failed, so the user is not left
      // apparently signed in after asking to leave.
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const refreshUser = React.useCallback(async () => {
    setUser(await api.get<CurrentUser>('/auth/me'));
  }, []);

  const can = React.useCallback(
    (permission: string) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const value = React.useMemo(
    () => ({ user, loading, login, logout, can, refreshUser }),
    [user, loading, login, logout, can, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
