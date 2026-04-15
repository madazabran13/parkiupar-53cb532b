import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import type { AppRole, UserProfile } from '@/types';

interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  role: AppRole | null;
  tenantId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar sesión desde localStorage al montar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (accessToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          setUser(parsedUser);
          setIsAuthenticated(true);

          // Cargar perfil completo desde user_profiles
          try {
            const profileData = await apiFetch<UserProfile>('/api/auth/me', {
              method: 'GET',
              auth: true,
            });
            setProfile(profileData);
          } catch (err) {
            console.error('Error al cargar perfil:', err);
          }
        }
      } catch (err) {
        console.error('Error al inicializar autenticación:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiFetch<{ user: AuthUser; tokens: TokenPair }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          auth: false,
        }
      );

      const { user: authUser, tokens } = response;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));

      setUser(authUser);
      setIsAuthenticated(true);

      // Cargar perfil completo
      try {
        const profileData = await apiFetch<UserProfile>('/api/auth/me', {
          method: 'GET',
          auth: true,
        });
        setProfile(profileData);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      const response = await apiFetch<{ user: AuthUser; tokens: TokenPair }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, nombre, rol: 'viewer' }),
          auth: false,
        }
      );

      const { user: authUser, tokens } = response;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));

      setUser(authUser);
      setIsAuthenticated(true);

      try {
        const profileData = await apiFetch<UserProfile>('/api/auth/me', {
          method: 'GET',
          auth: true,
        });
        setProfile(profileData);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        auth: true,
      });
    } catch (err) {
      console.error('Error al logout:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return;

      const tokens = await apiFetch<TokenPair>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        auth: false,
      });

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    } catch (err) {
      console.error('Error al refrescar token:', err);
      await signOut();
    }
  }, [signOut]);

  // Auto-logout después de 2 horas de inactividad
  useInactivityLogout(signOut, isAuthenticated);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: (profile?.role as AppRole) || null,
        tenantId: profile?.tenant_id || null,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
