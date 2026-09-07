import { createAuthModule } from './createAuthModule.jsx';

export { ApiError } from './createAuthModule.jsx';

const smartClassAuth = createAuthModule({
  loginPath: '/auth/smart-class/login',
  refreshPath: '/auth/smart-class/refresh',
  mePath: '/auth/smart-class/me',
  loginRoute: '/smart-class/login',
  storageKey: 'ssc_smart_class_refresh_token',
});

export const { apiFetch, apiFetchFile, AuthProvider, useAuth, ProtectedRoute } = smartClassAuth;
