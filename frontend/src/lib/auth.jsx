// Thin re-export of the social app's auth module, kept at this path so every existing social page's
// import ('../lib/auth.jsx') keeps working unchanged. The Smart Class section uses its own,
// completely separate instance -- see lib/smartClassAuth.jsx.
export { AuthProvider, useAuth, ProtectedRoute } from './socialAuth.jsx';
