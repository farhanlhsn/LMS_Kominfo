'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getSession } from './api-client';
import type { AuthSession } from './lms-types';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function userFromSession(session: AuthSession | null): User | null {
  if (!session) return null;
  const role = session.activeOrganization.isPlatformAdmin
    ? 'SUPER_ADMIN'
    : session.activeOrganization.roleKeys?.includes('org_admin')
      ? 'REGIONAL_ADMIN'
      : (session.activeOrganization.roleKeys?.[0] ?? 'learner');
  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email,
    email: session.user.email,
    role,
    regionId: session.activeOrganization.id,
  };
}

// Helper for cookies on the client side
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof window === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const syncSession = () => {
      setUser(userFromSession(getSession()));
      setIsLoading(false);
    };

    syncSession();
    window.addEventListener('lms-session-changed', syncSession);
    return () => window.removeEventListener('lms-session-changed', syncSession);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    setCookie('access_token', token, 7);
    setUser(userData);
    router.replace('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    deleteCookie('access_token');
    setUser(null);
    router.replace('/login');
    void api.logout().catch(() => clearSession());
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const refreshUser = async () => {
    try {
      const session = await api.hydrateSession();
      setUser(userFromSession(session));
    } catch (error) {
      console.warn('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
