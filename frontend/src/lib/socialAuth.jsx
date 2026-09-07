import { createAuthModule } from './createAuthModule.jsx';

export { ApiError } from './createAuthModule.jsx';

const socialAuth = createAuthModule({
  loginPath: '/auth/social/login',
  refreshPath: '/auth/social/refresh',
  mePath: '/auth/social/me',
  loginRoute: '/login',
  storageKey: 'ssc_social_refresh_token',
});

export const { apiFetch, apiFetchFile, AuthProvider, useAuth, ProtectedRoute } = socialAuth;
