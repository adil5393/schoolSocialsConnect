import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStore';

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

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return true;
}

export async function apiFetch(path, { method = 'GET', body, auth = true, isFormData = false, retry = true } = {}) {
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
      return apiFetch(path, { method, body, auth, isFormData, retry: false });
    }
    clearTokens();
    throw new ApiError('Session expired, please log in again', 401);
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorDetail(response, response.statusText), response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function login(email, password) {
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);
  const response = await fetch(`${BASE_URL}/auth/login`, {
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

export async function register(email, password, fullName) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, full_name: fullName },
  });
  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return data;
}

export function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/media', { method: 'POST', body: formData, isFormData: true });
}
