import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, ApiError } from '../lib/apiClient';

const PLATFORM_META = {
  facebook: { label: 'Facebook', icon: 'thumb_up', color: '#1877F2' },
  instagram: { label: 'Instagram', icon: 'photo_camera', color: '#E4405F' },
  whatsapp: { label: 'WhatsApp', icon: 'chat', color: '#25D366' },
};

const emptyForm = { platform: 'facebook', display_name: '', external_id: '', access_token: '' };

export default function SocialAccountsPage() {
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      setAccounts(await apiFetch('/social-accounts'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleDisconnect = async (id) => {
    setError('');
    try {
      await apiFetch(`/social-accounts/${id}`, { method: 'DELETE' });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disconnect account');
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/social-accounts', { method: 'POST', body: form });
      setForm(emptyForm);
      setShowForm(false);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto w-full pb-32 md:pb-margin-desktop">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-lg gap-4">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
              Connected Social Accounts
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Manage API integrations and connected accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 shadow-[0_4px_14px_0_rgba(192,193,255,0.39)] font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Social Account
          </button>
        </div>

        {error && (
          <div className="mb-md bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAddAccount} className="mb-lg bg-surface-container-low rounded-xl p-md card-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Display name</label>
              <input
                required
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Main Page"
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                {form.platform === 'whatsapp' ? 'Phone number ID' : form.platform === 'instagram' ? 'IG Business account ID' : 'Page ID'}
              </label>
              <input
                required
                value={form.external_id}
                onChange={(e) => setForm((f) => ({ ...f, external_id: e.target.value }))}
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Access token</label>
              <input
                required
                type="password"
                value={form.access_token}
                onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
                placeholder="Long-lived token from Meta Business Manager"
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
              />
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
                {submitting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-8">Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-8">
            No accounts connected yet. Click "Add Social Account" to connect Facebook, Instagram, or WhatsApp.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {accounts.map((acc) => {
              const meta = PLATFORM_META[acc.platform] || { label: acc.platform, icon: 'share', color: '#888' };
              const isConnected = acc.status === 'connected';
              return (
                <div
                  key={acc.id}
                  className="bg-surface-container rounded-xl p-md border border-outline-variant/20 relative overflow-hidden group transition-all duration-300 glow-hover flex flex-col h-full"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(to bottom right, ${meta.color}15, transparent)` }}
                  />
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center border"
                        style={{ backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}33`, color: meta.color }}
                      >
                        <span className="material-symbols-outlined">{meta.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{meta.label}</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[160px]" title={acc.display_name}>
                          {acc.display_name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-label-md text-label-md px-2 py-1 rounded border flex items-center gap-1.5 font-semibold ${
                        isConnected
                          ? 'bg-secondary-container/10 text-secondary border-secondary-container/20'
                          : 'bg-error-container/10 text-error border-error-container/20'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className={`flex items-center gap-2 font-body-sm text-body-sm ${isConnected ? 'text-on-surface-variant' : 'text-error'}`}>
                      <span className="material-symbols-outlined text-[16px]">{isConnected ? 'sync' : 'error'}</span>
                      {acc.last_error || (isConnected ? `Connected ${new Date(acc.created_at).toLocaleDateString()}` : 'Disconnected')}
                    </div>
                    {isConnected && (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(acc.id)}
                        className="w-full bg-surface-variant text-error font-label-md text-label-md py-2 rounded-lg border border-outline-variant/30 hover:bg-error-container/20 hover:border-error/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">link_off</span> Disconnect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
