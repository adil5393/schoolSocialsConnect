import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, uploadMedia, ApiError } from '../lib/apiClient';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'image' | 'video'
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMedia = async () => {
    setLoading(true);
    setError('');
    try {
      setMediaItems(await apiFetch('/media'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        await uploadMedia(file);
      }
      await loadMedia();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteSelected = async () => {
    setError('');
    try {
      await Promise.all(selectedIds.map((id) => apiFetch(`/media/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      await loadMedia();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete selected media');
    }
  };

  const filteredMedia = mediaItems.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.media_type === activeFilter;
    const matchesSearch = searchQuery === '' || item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar
        showSearch={true}
        searchPlaceholder="Search media..."
        onSearch={(q) => setSearchQuery(q)}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-md relative z-10 pb-32 md:pb-margin-desktop max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
          <div>
            <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface font-bold">
              Media Library
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Manage all your visual assets for social campaigns.
            </p>
          </div>
          <label className="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg hover:bg-primary-fixed-dim transition-colors shadow-[0_4px_14px_0_rgba(192,193,255,0.2)] font-semibold cursor-pointer">
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {uploading ? 'Uploading…' : 'Upload Media'}
          </label>
        </div>

        {error && (
          <div className="bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10 luminous-outline">
          <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {[
              { key: 'all', label: 'All Media' },
              { key: 'image', label: 'Images' },
              { key: 'video', label: 'Videos' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-1.5 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors border ${
                  activeFilter === f.key
                    ? 'bg-surface-variant text-on-surface border-outline-variant/20 font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-8">Loading media…</p>
        ) : filteredMedia.length === 0 ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-8">
            No media yet. Upload something to get started.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`group relative bg-surface-container rounded-xl overflow-hidden luminous-outline luminous-hover cursor-pointer flex flex-col transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-variant">
                    {item.media_type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <div
                        className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                        style={{ backgroundImage: `url('${item.url}')` }}
                      />
                    )}

                    {item.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-surface/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                          <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            play_arrow
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="media-checkbox cursor-pointer" />
                    </div>

                    <div className="absolute top-2 right-2 bg-surface/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-outline-variant/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                        {item.media_type === 'video' ? 'movie' : 'image'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-low flex-1 flex flex-col justify-between border-t border-outline-variant/10">
                    <p className="font-body-sm text-body-sm text-on-surface truncate" title={item.filename}>
                      {item.filename}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-label-md text-label-md text-on-surface-variant/70">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-label-md text-label-md text-on-surface-variant/70">{formatSize(item.size_bytes)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/30 rounded-full px-4 py-2.5 flex items-center gap-4 shadow-2xl z-50 animate-bounce-short">
            <span className="font-label-md text-label-md text-on-surface bg-surface-variant px-2.5 py-1 rounded-md font-semibold">
              {selectedIds.length} Selected
            </span>
            <div className="h-4 w-px bg-outline-variant/30"></div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span> Use in Post
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="font-label-md text-label-md text-error hover:text-error-container transition-colors flex items-center gap-1 ml-2 cursor-pointer"
              title="Delete selected"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
