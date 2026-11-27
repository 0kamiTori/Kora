import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../../features/auth/auth.api';
import type { AdminUser, LoginRequest, Permission } from '../../features/auth/auth.types';
import { configureSession, setAccessToken } from '../../shared/api/client';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: AdminUser | null;
  /** RBAC: la fuente de verdad son los permisos que entrega el backend para la sesión. */
  hasPermission: (permission: Permission) => boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sesión, rol y permisos (RNF01).
 * El token de acceso se guarda solo en memoria (`client.ts`). Al recargar la página se
 * intenta restaurar la sesión con POST /auth/refresh, que depende de la cookie httpOnly.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    // Ningún dato de la sesión anterior debe quedar en la caché del navegador.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    configureSession({
      refresh: async () => {
        const session = await authApi.refreshSession();
        setAccessToken(session.accessToken);
        if (!cancelled) setUser(session.user);
        return session.accessToken;
      },
      onUnauthorized: () => {
        if (!cancelled) clearSession();
      },
    });

    authApi
      .refreshSession()
      .then((session) => {
        if (cancelled) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });

    return () => {
      cancelled = true;
      configureSession({ refresh: null, onUnauthorized: null });
    };
  }, [clearSession]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const session = await authApi.login(credentials);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set<Permission>(user?.permissions ?? []);
    return {
      status,
      user,
      hasPermission: (permission) => permissions.has(permission),
      login,
      logout,
    };
  }, [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}
