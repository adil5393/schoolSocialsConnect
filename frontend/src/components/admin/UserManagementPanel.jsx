import React, { useEffect, useState } from 'react';

const emptyForm = { email: '', password: '', full_name: '', role: 'editor', has_social_access: false, has_smart_class_access: false };

export default function UserManagementPanel({ apiFetch, ApiError }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await apiFetch('/admin/users'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/admin/users', { method: 'POST', body: form });
      setForm(emptyForm);
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const patchUser = async (id, patch) => {
    setError('');
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: patch });
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user');
    }
  };

  const handleResetPassword = async (id) => {
    const password = window.prompt('New password (min 8 characters):');
    if (!password) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    await patchUser(id, { password });
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Manage Users</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span> New User
        </button>
      </div>

      {error && (
        <div className="bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container-low rounded-xl p-md card-border grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Email / username</label>
            <input
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Full name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Password</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-6">
            <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_social_access}
                onChange={(e) => setForm((f) => ({ ...f, has_social_access: e.target.checked }))}
              />
              Social Media Manager access
            </label>
            <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_smart_class_access}
                onChange={(e) => setForm((f) => ({ ...f, has_smart_class_access: e.target.checked }))}
              />
              Smart Class Library access
            </label>
          </div>
          <div className="sm:col-span-2 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
      ) : (
        <div className="bg-surface-container-low rounded-xl card-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 font-label-md text-label-md text-on-surface-variant">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Social</th>
                <th className="p-3 text-center">Smart Class</th>
                <th className="p-3 text-center">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-outline-variant/10 last:border-0">
                  <td className="p-3">
                    <p className="font-body-sm text-body-sm text-on-surface font-semibold">{u.full_name}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">{u.email}</p>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      className="bg-surface-dim border border-outline-variant/30 rounded-md px-2 py-1 text-on-surface text-sm"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => patchUser(u.id, { has_social_access: !u.has_social_access })}
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer ${
                        u.has_social_access ? 'bg-secondary/20 text-secondary' : 'bg-surface-variant text-on-surface-variant'
                      }`}
                      title="Toggle Social Media Manager access"
                    >
                      <span className="material-symbols-outlined text-[16px]">{u.has_social_access ? 'check' : 'close'}</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => patchUser(u.id, { has_smart_class_access: !u.has_smart_class_access })}
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer ${
                        u.has_smart_class_access ? 'bg-secondary/20 text-secondary' : 'bg-surface-variant text-on-surface-variant'
                      }`}
                      title="Toggle Smart Class Library access"
                    >
                      <span className="material-symbols-outlined text-[16px]">{u.has_smart_class_access ? 'check' : 'close'}</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer ${
                        u.is_active ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'
                      }`}
                      title="Toggle active"
                    >
                      <span className="material-symbols-outlined text-[16px]">{u.is_active ? 'check' : 'close'}</span>
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u.id)}
                      className="font-label-md text-label-md text-primary hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
