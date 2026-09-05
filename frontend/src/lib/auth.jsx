import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiFetch, login as apiLogin, register as apiRegister } from './apiClient';
import { clearTokens, getAccessToken, getRefreshToken, subscribe } from './tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const loadUser = useCallback(async () => {
    if (!getAccessToken() && !getRefreshToken()) {
      setUser(null);
      setInitializing(false);
      return;
    }
    try {
      setUser(await apiFetch('/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    return subscribe(() => {
      if (!getAccessToken()) setUser(null);
    });
  }, [loadUser]);

  const login = async (email, password) => {
    await apiLogin(email, password);
    await loadUser();
  };

  const register = async (email, password, fullName) => {
    await apiRegister(email, password, fullName);
    await loadUser();
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, initializing, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
