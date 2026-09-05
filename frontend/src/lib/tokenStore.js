const REFRESH_KEY = 'ssc_refresh_token';

// Access token lives only in memory (cleared on page reload); refresh token persists in
// localStorage so a reload can silently re-establish a session via /auth/refresh.
let accessToken = null;
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens({ accessToken: at, refreshToken: rt }) {
  accessToken = at;
  if (rt) {
    try {
      localStorage.setItem(REFRESH_KEY, rt);
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
  }
  notify();
}

export function clearTokens() {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}
