import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, ACCESS_TOKEN_KEY } from '../api/client';
import * as authApi from '../api/auth';
import type { AuthUser, RegisterInput } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/auth/me');
      if (!response.ok) throw new Error('Session expirée');
      const me: AuthUser = await response.json();
      setUser(me);
    } catch {
      await authApi.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const loggedInUser = await authApi.login(email, password);
    setUser(loggedInUser);
  }

  // No tokens are issued by the server on register (email verification
  // required first) — the caller does not get logged in automatically.
  async function register(input: RegisterInput) {
    return authApi.register(input);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
