import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function extractErrorDetail(response, fallback) {
  try {
    const data = await response.json();
    return data.detail || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Builds a fully independent auth + API client for one "app" (social vs smart-class). Each call
 * gets its own private token store (closed over here, not module-level) and its own localStorage
 * key, so the two apps never share session state in the same browser -- logging into one has no
 * effect on the other, matching the backend's per-app token scoping (see deps.py).
 */
export function createAuthModule({ loginPath, refreshPath, mePath, loginRoute, storageKey }) {
  let accessToken = null;
  const listeners = new Set();

  function getAccessToken() {
    return accessToken;
  }
  function getRefreshToken() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }
  function setTokens({ accessToken: at, refreshToken: rt }) {
    accessToken = at;
    if (rt) {
      try {
        localStorage.setItem(storageKey, rt);
      } catch {
        // ignore storage failures (e.g. private browsing)
      }
    }
    notify();
  }
  function clearTokens() {
    accessToken = null;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    notify();
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notify() {
    listeners.forEach((listener) => listener());
  }

  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    const response = await fetch(`${BASE_URL}${refreshPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return true;
  }

  async function _rawFetch(path, { method = 'GET', body, auth = true, isFormData = false, retry = true } = {}) {
    const headers = {};
    if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });

    if (response.status === 401 && auth && retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return _rawFetch(path, { method, body, auth, isFormData, retry: false });
      }
      clearTokens();
      throw new ApiError('Session expired, please log in again', 401);
    }

    if (!response.ok) {
      throw new ApiError(await extractErrorDetail(response, response.statusText), response.status);
    }

    return response;
  }

  async function apiFetch(path, options = {}) {
    const response = await _rawFetch(path, options);
    if (response.status === 204) return null;
    return response.json();
  }

  async function apiFetchFile(path, options = {}) {
    const response = await _rawFetch(path, options);
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = match ? decodeURIComponent(match[1]) : 'download';
    return { blob, filename };
  }

  async function login(email, password) {
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', password);
    const response = await fetch(`${BASE_URL}${loginPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new ApiError(await extractErrorDetail(response, 'Login failed'), response.status);
    }
    const data = await response.json();
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return data;
  }

  const AuthContext = createContext(null);

  function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    const loadUser = useCallback(async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        setUser(null);
        setInitializing(false);
        return;
      }
      try {
        setUser(await apiFetch(mePath));
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

    const contextLogin = async (email, password) => {
      await login(email, password);
      await loadUser();
    };

    const logout = () => {
      clearTokens();
      setUser(null);
    };

    return (
      <AuthContext.Provider value={{ user, initializing, login: contextLogin, logout }}>{children}</AuthContext.Provider>
    );
  }

  function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within its matching AuthProvider');
    return ctx;
  }

  function ProtectedRoute({ children }) {
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
      return <Navigate to={loginRoute} replace state={{ from: location }} />;
    }

    return children;
  }

  return { apiFetch, apiFetchFile, AuthProvider, useAuth, ProtectedRoute };
}
