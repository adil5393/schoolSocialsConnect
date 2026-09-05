import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, ApiError } from '../lib/apiClient';

const STATUS_META = {
  published: { label: 'Published', chipClass: 'bg-secondary/10 text-secondary border border-secondary/20', icon: 'check_circle' },
  scheduled: { label: 'Scheduled', chipClass: 'bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim border border-tertiary-fixed-dim/20', icon: 'schedule' },
  draft: { label: 'Draft', chipClass: 'bg-surface-variant text-on-surface border border-outline-variant/30', icon: 'edit_document' },
  publishing: { label: 'Publishing', chipClass: 'bg-primary/10 text-primary border border-primary/20', icon: 'sync' },
  failed: { label: 'Failed', chipClass: 'bg-error/10 text-error border border-error/20', icon: 'error' },
  partially_failed: { label: 'Partially Failed', chipClass: 'bg-error/10 text-error border border-error/20', icon: 'warning' },
};

const PLATFORM_META = {
  facebook: { icon: 'thumb_up', bg: 'bg-blue-600/90' },
  instagram: { icon: 'photo_camera', bg: 'bg-pink-600/90' },
  whatsapp: { icon: 'chat', bg: 'bg-green-600/90' },
};

const TAB_TO_STATUS = { published: 'published', scheduled: 'scheduled', drafts: 'draft' };

export default function ContentManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const activeTab = searchParams.get('status') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch('/posts')
      .then(setPosts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load posts'))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (status) => {
    if (status === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status });
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'failed' ? ['failed', 'partially_failed'].includes(post.status) : post.status === TAB_TO_STATUS[activeTab]);
      const matchesSearch = searchQuery === '' || post.caption.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [posts, activeTab, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar
        title="Content Library"
        showSearch={true}
        searchPlaceholder="Search posts..."
        onSearch={(q) => setSearchQuery(q)}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 p-margin-mobile md:p-margin-desktop bg-gradient-to-b from-transparent to-surface-container-lowest/50 pb-32 md:pb-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
          <div className="flex overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar gap-2">
            {[
              { label: 'All Posts', key: 'all' },
              { label: 'Published', key: 'published' },
              { label: 'Scheduled', key: 'scheduled' },
              { label: 'Drafts', key: 'drafts' },
              { label: 'Failed', key: 'failed' },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors border ${
                    isSelected
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'text-on-surface-variant hover:bg-surface-variant/50 border-transparent hover:border-outline-variant/20'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                title="Grid view"
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                title="List view"
              >
                <span className="material-symbols-outlined text-[20px]">view_list</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="btn-gradient text-white px-4 py-1.5 rounded-lg font-label-md text-sm font-semibold flex items-center gap-1 shadow-md shadow-primary/20 ml-2"
            >
              <span className="material-symbols-outlined text-sm">add</span> New Post
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-md bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-16">Loading posts…</p>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant glass-panel rounded-2xl p-8">
            <span className="material-symbols-outlined text-5xl mb-2 text-outline">article</span>
            <p className="font-headline-sm text-lg font-semibold text-on-surface">No posts found</p>
            <p className="text-sm mt-1">Try switching tabs, adjusting your search, or create a new post.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter' : 'space-y-4 max-w-4xl'}>
            {filteredPosts.map((post) => {
              const statusMeta = STATUS_META[post.status] || STATUS_META.draft;
              const dateLabel = post.scheduled_at
                ? new Date(post.scheduled_at).toLocaleString()
                : `Last updated: ${new Date(post.updated_at).toLocaleString()}`;
              return (
                <article key={post.id} className="bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden flex flex-col group luminous-hover transition-all duration-300">
                  <div className="relative h-48 bg-surface-container-low overflow-hidden flex items-center justify-center border-b border-white/5">
                    {post.media[0] ? (
                      <img
                        src={post.media[0].url}
                        alt="Post media preview"
                        className={`w-full h-full object-cover transition-all duration-500 ${
                          post.status === 'draft' ? 'opacity-60 grayscale group-hover:grayscale-0' : 'group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div className="text-center p-4">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-2">calendar_month</span>
                        <p className="font-label-md text-label-md text-on-surface-variant">No Media Attached</p>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1">
                      {post.targets.map((t) => {
                        const platMeta = PLATFORM_META[t.platform] || { icon: 'share', bg: 'bg-gray-600/90' };
                        return (
                          <span key={t.id} className={`${platMeta.bg} text-white rounded-md p-1 backdrop-blur-sm flex items-center justify-center`} title={t.platform}>
                            <span className="material-symbols-outlined text-sm">{platMeta.icon}</span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`${statusMeta.chipClass} px-2 py-1 rounded-md text-xs font-label-md flex items-center gap-1 backdrop-blur-sm`}>
                        <span className="material-symbols-outlined text-[14px]">{statusMeta.icon}</span> {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <p className={`font-label-md text-label-md mb-2 ${post.status === 'scheduled' ? 'text-tertiary-fixed-dim' : 'text-on-surface-variant'}`}>
                      {dateLabel}
                    </p>
                    <p className={`font-body-sm text-body-sm mb-4 line-clamp-3 flex-1 ${post.status === 'draft' ? 'text-on-surface-variant italic' : 'text-on-surface'}`}>
                      {post.caption || '(No caption)'}
                    </p>

                    <div className="border-t border-outline-variant/10 pt-3 mt-auto">
                      {post.status === 'published' || post.status === 'partially_failed' || post.status === 'failed' ? (
                        <div className="flex flex-wrap gap-2">
                          {post.targets.map((t) => (
                            <span key={t.id} className="text-xs text-on-surface-variant flex items-center gap-1 capitalize">
                              {t.platform}: <span className={t.status === 'published' ? 'text-secondary' : t.status === 'failed' ? 'text-error' : ''}>{t.status}</span>
                            </span>
                          ))}
                        </div>
                      ) : post.status === 'scheduled' ? (
                        <button type="button" onClick={() => navigate('/create')} className="text-primary font-label-md text-label-md hover:underline w-full text-center cursor-pointer">
                          Edit Post
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/create')}
                          className="bg-primary-container text-on-primary-container px-4 py-1.5 rounded-lg font-label-md text-label-md w-full hover:bg-primary transition-colors font-semibold cursor-pointer"
                        >
                          Continue Editing
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
