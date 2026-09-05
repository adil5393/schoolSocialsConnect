import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, uploadMedia, ApiError } from '../lib/apiClient';

const PLATFORM_META = {
  facebook: { label: 'Facebook', icon: 'thumb_up', color: '#1877F2' },
  instagram: { label: 'Instagram', icon: 'photo_camera', color: '#E4405F' },
  whatsapp: { label: 'WhatsApp', icon: 'chat', color: '#25D366' },
};

export default function CreatePostPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [postText, setPostText] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState(new Set());
  const [media, setMedia] = useState([]); // [{id, url, media_type}]
  const [uploading, setUploading] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [whatsappTemplateId, setWhatsappTemplateId] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [accountsData, groupsData, templatesData] = await Promise.all([
          apiFetch('/social-accounts'),
          apiFetch('/whatsapp-groups'),
          apiFetch('/whatsapp-templates'),
        ]);
        setAccounts(accountsData.filter((a) => a.status === 'connected'));
        setWhatsappGroups(groupsData);
        setWhatsappTemplates(templatesData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load composer data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleAccount = (id) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAccounts = () => {
    setSelectedAccountIds((prev) => (prev.size === accounts.length ? new Set() : new Set(accounts.map((a) => a.id))));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const asset = await uploadMedia(file);
        setMedia((prev) => [...prev, asset]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = (id) => setMedia((prev) => prev.filter((m) => m.id !== id));

  const includesWhatsapp = () => accounts.some((a) => selectedAccountIds.has(a.id) && a.platform === 'whatsapp');

  const buildTargets = () =>
    accounts
      .filter((a) => selectedAccountIds.has(a.id))
      .map((a) =>
        a.platform === 'whatsapp'
          ? {
              social_account_id: a.id,
              whatsapp_group_id: whatsappGroupId ? Number(whatsappGroupId) : null,
              whatsapp_template_id: whatsappTemplateId ? Number(whatsappTemplateId) : null,
            }
          : { social_account_id: a.id }
      );

  const createPost = async ({ scheduled_at = null } = {}) =>
    apiFetch('/posts', {
      method: 'POST',
      body: {
        caption: postText,
        media_asset_ids: media.map((m) => m.id),
        targets: buildTargets(),
        scheduled_at,
      },
    });

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setError('');
    try {
      await createPost();
      navigate('/content?status=drafts');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const validateTargets = () => {
    if (selectedAccountIds.size === 0) {
      setError('Select at least one platform to publish to.');
      return false;
    }
    if (includesWhatsapp() && (!whatsappGroupId || !whatsappTemplateId)) {
      setError('Pick a WhatsApp broadcast group and an approved template before publishing to WhatsApp.');
      return false;
    }
    return true;
  };

  const handleConfirmSchedule = async () => {
    setError('');
    if (!scheduledAt) {
      setError('Pick a date and time to schedule this post.');
      return;
    }
    if (!validateTargets()) return;
    setSubmitting(true);
    try {
      await createPost({ scheduled_at: new Date(scheduledAt).toISOString() });
      navigate('/calendar');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to schedule post');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    setError('');
    if (!validateTargets()) return;
    setSubmitting(true);
    try {
      const post = await createPost();
      await apiFetch(`/posts/${post.id}/publish-now`, { method: 'POST' });
      navigate('/content');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.has(a.id));

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 w-full overflow-y-auto pb-40 md:pb-28">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg">
          <div className="mb-lg">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">
              Create Post
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Create once. Publish everywhere.</p>
          </div>

          {error && (
            <div className="mb-md bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-gutter relative">
            <div className="w-full lg:w-7/12 xl:w-2/3 flex flex-col gap-lg">
              {/* Publish To */}
              <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Publish to</h3>
                  {accounts.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllAccounts}
                      className="text-primary hover:text-primary-container font-label-md text-label-md transition-colors cursor-pointer"
                    >
                      {selectedAccountIds.size === accounts.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {loading ? (
                  <p className="text-on-surface-variant font-body-sm text-body-sm">Loading connected accounts…</p>
                ) : accounts.length === 0 ? (
                  <p className="text-on-surface-variant font-body-sm text-body-sm">
                    No connected accounts yet.{' '}
                    <button type="button" onClick={() => navigate('/accounts')} className="text-primary hover:underline cursor-pointer">
                      Connect one
                    </button>{' '}
                    to start publishing.
                  </p>
                ) : (
                  <div className="flex overflow-x-auto no-scrollbar gap-sm pb-2 -mx-2 px-2">
                    {accounts.map((account) => {
                      const meta = PLATFORM_META[account.platform] || { icon: 'share', color: '#888' };
                      const checked = selectedAccountIds.has(account.id);
                      return (
                        <label key={account.id} className="flex-shrink-0 relative group cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleAccount(account.id)} className="peer sr-only" />
                          <div className="w-32 h-24 bg-surface-container rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center gap-2 transition-all group-hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/10 glow-hover">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                            >
                              <span className="material-symbols-outlined">{meta.icon}</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface truncate max-w-[100px]">
                              {account.display_name}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-outline-variant/50 flex items-center justify-center opacity-0 group-hover:opacity-100 peer-checked:opacity-100 peer-checked:bg-primary peer-checked:border-primary transition-all">
                            <span className="material-symbols-outlined text-[12px] text-on-primary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {includesWhatsapp() && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant block mb-1">WhatsApp broadcast group</label>
                      <select
                        value={whatsappGroupId}
                        onChange={(e) => setWhatsappGroupId(e.target.value)}
                        className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface text-sm"
                      >
                        <option value="">Select a group…</option>
                        {whatsappGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.contacts.length})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Approved message template</label>
                      <select
                        value={whatsappTemplateId}
                        onChange={(e) => setWhatsappTemplateId(e.target.value)}
                        className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface text-sm"
                      >
                        <option value="">Select a template…</option>
                        {whatsappTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </section>

              {/* Content Composer */}
              <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">What would you like to share?</h3>
                <div className="relative mt-2">
                  <textarea
                    rows={6}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    maxLength={2200}
                    placeholder="Announce the upcoming science fair, share a recent success story, or post a quick update..."
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg p-4 font-body-md text-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none placeholder:text-on-surface-variant/50"
                  />
                  <div className="absolute bottom-4 right-4 font-label-md text-label-md text-on-surface-variant/70">
                    <span>{postText.length}</span> / 2200
                  </div>
                </div>
              </section>

              {/* Media Upload */}
              <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">Media Upload</h3>
                <label className="border-2 border-dashed border-outline-variant/40 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 bg-surface-dim hover:bg-surface-variant/20 hover:border-primary/50 transition-all cursor-pointer group">
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface mb-1">{uploading ? 'Uploading…' : 'Click or drag media here'}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">JPG, PNG, GIF, WEBP, MP4</p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/media');
                    }}
                    className="px-4 py-2 border border-outline-variant text-on-surface rounded-md font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
                  >
                    Choose from Library
                  </span>
                </label>

                {media.length > 0 && (
                  <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar pb-2">
                    {media.map((item) => (
                      <div key={item.id} className="relative w-32 h-32 rounded-lg overflow-hidden group border border-outline-variant/20 flex-shrink-0">
                        {item.media_type === 'video' ? (
                          <video src={item.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img alt="Uploaded media" className="w-full h-full object-cover" src={item.url} />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeMedia(item.id)}
                            className="w-8 h-8 rounded-full bg-surface/80 flex items-center justify-center text-error hover:bg-error hover:text-on-error transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Preview */}
            <div className="w-full lg:w-5/12 xl:w-1/3 mt-lg lg:mt-0">
              <div className="sticky top-24 bg-surface-container-low rounded-2xl p-4 card-border shadow-2xl shadow-black/50 flex flex-col">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-4 px-2">Preview</h3>
                <div className="bg-surface-dim rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col">
                  <div className="bg-white p-4 text-black font-sans">
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words mb-3">
                      {postText || 'Your post caption will appear here...'}
                    </p>
                    {media[0] && (
                      <div className="rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                        {media[0].media_type === 'video' ? (
                          <video src={media[0].url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={media[0].url} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant mt-3 px-2">
                  Publishing to: {selectedAccounts.length === 0 ? 'none selected' : selectedAccounts.map((a) => a.display_name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 bg-surface-container-high/95 backdrop-blur-xl border-t border-outline-variant/20 px-margin-mobile md:px-margin-desktop py-4 z-40 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {showScheduler && (
          <div className="flex items-center gap-2 flex-wrap order-first md:order-none">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-surface-dim border border-outline-variant/30 rounded-md px-3 py-2 text-on-surface text-sm"
            />
            <button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={submitting}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
            >
              Confirm
            </button>
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/content')}
            className="px-6 py-2.5 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="px-6 py-2.5 bg-surface-dim border border-outline-variant/50 text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span> Save Draft
          </button>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowScheduler((v) => !v)}
            className="px-6 py-2.5 bg-surface-dim border border-primary/30 text-primary rounded-lg font-label-md text-label-md hover:bg-primary/10 hover:border-primary transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">schedule</span> Schedule
          </button>
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={submitting}
            className="px-8 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-[0_0_20px_rgba(192,193,255,0.2)] hover:shadow-[0_0_25px_rgba(192,193,255,0.4)] font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">send</span> {submitting ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
