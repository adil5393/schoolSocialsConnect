import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, ApiError } from '../lib/apiClient';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLATFORM_ICON = { facebook: 'thumb_up', instagram: 'photo_camera', whatsapp: 'chat' };

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push({ date, isCurrentMonth: date.getMonth() === month });
  }
  return cells;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const from = grid[0].date;
    const to = grid[grid.length - 1].date;
    setLoading(true);
    setError('');
    apiFetch(`/calendar?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(setPosts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load calendar'))
      .finally(() => setLoading(false));
  }, [grid]);

  const postsForDay = (date) => posts.filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), date));

  const openPostDetails = (post) => {
    setSelectedPost(post);
    setDrawerOpen(true);
  };
  const closePostDetails = () => setDrawerOpen(false);

  const goToToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  const goPrevMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));

  const today = new Date();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar showSearch={false} onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 overflow-y-auto p-sm md:p-gutter relative pb-32 md:pb-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-sm max-w-7xl mx-auto">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
            {monthLabel}
          </h2>

          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex items-center justify-center p-2 rounded-full border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all hover:bg-primary/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-md py-1.5 rounded-full border border-outline-variant/30 font-label-md text-label-md text-on-surface hover:bg-surface-variant/50 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex items-center justify-center p-2 rounded-full border border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all hover:bg-primary/5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto mb-md bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <div className="max-w-7xl mx-auto bg-surface rounded-xl border border-outline-variant/10 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="grid grid-cols-7 border-b border-outline-variant/10 bg-surface-container-lowest/50">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-sm px-xs text-center font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-outline-variant/10 gap-[1px]">
            {grid.map(({ date, isCurrentMonth }) => {
              const dayPosts = postsForDay(date);
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[110px] md:min-h-[130px] p-xs group hover:bg-surface-container-low transition-colors relative ${
                    isCurrentMonth ? 'bg-surface' : 'bg-surface-dim opacity-50'
                  } ${isToday ? 'border-t-2 border-primary bg-primary/5' : ''}`}
                >
                  <span
                    className={
                      isToday
                        ? 'w-6 h-6 flex items-center justify-center rounded-full bg-primary text-on-primary font-label-md text-label-md ml-0.5 mt-0.5 font-bold'
                        : 'font-label-md text-label-md text-on-surface ml-1'
                    }
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-1 mt-1.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        onClick={() => openPostDetails(post)}
                        className="bg-surface-container rounded-md p-1.5 border border-outline-variant/20 hover:border-primary/50 transition-all flex flex-col gap-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between px-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              post.status === 'published' ? 'bg-secondary-container' : post.status === 'draft' ? 'bg-surface-variant' : 'bg-primary-container'
                            }`}
                          ></span>
                          <span className="font-label-md text-[10px] text-on-surface-variant">
                            {new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-surface-dim p-1 rounded-sm">
                          <span className="material-symbols-outlined text-[12px] text-blue-400">
                            {PLATFORM_ICON[post.targets[0]?.platform] || 'share'}
                          </span>
                          <p className="font-body-sm text-[11px] text-on-surface truncate">{post.caption || 'Untitled post'}</p>
                        </div>
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <span className="font-label-md text-[10px] text-on-surface-variant px-1">+{dayPosts.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading && <p className="text-center text-on-surface-variant font-body-sm text-body-sm mt-4">Loading…</p>}

        <div className="mt-md flex flex-wrap gap-md justify-end px-xs max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-label-md text-label-md text-on-surface-variant">Published</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            <span className="font-label-md text-label-md text-on-surface-variant">Scheduled</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/create')}
          className="fixed bottom-24 md:bottom-lg right-lg w-14 h-14 bg-gradient-to-b from-primary to-primary-container rounded-full shadow-[0_0_20px_rgba(192,193,255,0.3)] flex items-center justify-center text-on-primary hover:scale-105 transition-transform z-40 border border-primary-fixed/50 group cursor-pointer"
          title="Create New Post"
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
        </button>
      </main>

      {drawerOpen && selectedPost && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer" onClick={closePostDetails} />
          <div className="relative h-full w-full max-w-md bg-surface border-l border-outline-variant/20 shadow-2xl flex flex-col drawer-slide-in z-10">
            <div className="flex items-center justify-between p-md border-b border-outline-variant/10">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Post Details</h3>
              <button type="button" className="text-on-surface-variant hover:bg-surface-variant p-2 rounded-full transition-colors cursor-pointer" onClick={closePostDetails}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-md space-y-lg">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary-container/10 text-primary-container border border-primary-container/20 font-label-md text-label-md flex items-center gap-2 font-semibold capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span> {selectedPost.status}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>{' '}
                  {selectedPost.scheduled_at ? new Date(selectedPost.scheduled_at).toLocaleString() : '—'}
                </span>
              </div>

              {selectedPost.media[0] ? (
                <div className="rounded-xl overflow-hidden border border-outline-variant/20 aspect-video relative">
                  <img src={selectedPost.media[0].url} alt="Post asset preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-1">image_not_supported</span>
                  <p className="text-sm">No media attached to this post.</p>
                </div>
              )}

              <div>
                <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase font-semibold">Caption</h4>
                <p className="font-body-md text-body-md text-on-surface bg-surface-container-low p-sm rounded-lg border border-outline-variant/10 leading-relaxed whitespace-pre-wrap">
                  {selectedPost.caption || '(No caption)'}
                </p>
              </div>

              <div>
                <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase font-semibold">Platforms</h4>
                <div className="flex flex-col gap-2">
                  {selectedPost.targets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-surface-container-low p-2 rounded-lg border border-outline-variant/10">
                      <span className="capitalize font-body-sm text-body-sm text-on-surface">{t.platform}</span>
                      <span className="font-label-md text-label-md text-on-surface-variant capitalize">{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-md border-t border-outline-variant/10 bg-surface-container-lowest flex gap-sm">
              <button
                type="button"
                onClick={() => {
                  closePostDetails();
                  navigate('/create');
                }}
                className="flex-1 bg-surface-variant text-on-surface hover:bg-surface-variant/80 py-2.5 rounded-lg font-label-md text-label-md transition-colors border border-outline-variant/20 font-semibold cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  closePostDetails();
                  navigate('/content');
                }}
                className="flex-1 bg-primary text-on-primary hover:bg-primary/90 py-2.5 rounded-lg font-label-md text-label-md transition-colors shadow-[0_4px_14px_rgba(192,193,255,0.2)] font-bold cursor-pointer"
              >
                View in Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
