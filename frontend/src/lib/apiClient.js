// Thin re-export of the social app's API client, kept at this path so every existing social page's
// import ('../lib/apiClient') keeps working unchanged. The Smart Class section uses its own,
// completely separate instance -- see lib/smartClassAuth.jsx.
import { apiFetch, apiFetchFile, ApiError } from './socialAuth.jsx';

export { apiFetch, apiFetchFile, ApiError };

export function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/media', { method: 'POST', body: formData, isFormData: true });
}
