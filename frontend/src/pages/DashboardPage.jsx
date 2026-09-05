import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { apiFetch, ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth.jsx';

const PLATFORM_META = {
  facebook: { label: 'Facebook', icon: 'thumb_up', color: '#1877F2' },
  instagram: { label: 'Instagram', icon: 'photo_camera', color: '#E4405F' },
  whatsapp: { label: 'WhatsApp', icon: 'chat', color: '#25D366' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [channels, setChannels] = useState([]);
  const [upcomingPosts, setUpcomingPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [statsData, activityData, channelsData, postsData] = await Promise.all([
          apiFetch('/dashboard/stats'),
          apiFetch('/dashboard/activity'),
          apiFetch('/dashboard/channels'),
          apiFetch('/posts?status_filter=scheduled'),
        ]);
        setStats(statsData);
        setActivity(activityData);
        setChannels(channelsData);
        setUpcomingPosts(postsData.slice(0, 3));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
      }
    })();
  }, []);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="p-margin-mobile md:p-margin-desktop space-y-8 pb-32 md:pb-margin-desktop max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background font-bold">
                Good morning, {firstName}!
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Here's what's happening across your social channels.
              </p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="btn-gradient text-white font-label-md text-label-md px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 shrink-0 font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add
              </span>
              Create Post
            </button>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl hover:bg-surface-variant/20 transition-colors glow-hover relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>
                    hub
                  </span>
                </div>
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-1">Connected Accounts</h3>
                <p className="font-display-lg text-display-lg text-on-background font-bold">{stats?.connected_accounts ?? '—'}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl hover:bg-surface-variant/20 transition-colors glow-hover relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '48px' }}>
                    schedule
                  </span>
                </div>
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-1">Scheduled Posts</h3>
                <p className="font-display-lg text-display-lg text-on-background font-bold">{stats?.scheduled_posts ?? '—'}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl hover:bg-surface-variant/20 transition-colors glow-hover relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>
                    bar_chart
                  </span>
                </div>
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-1">Posts This Month</h3>
                <p className="font-display-lg text-display-lg text-on-background font-bold">{stats?.posts_this_month ?? '—'}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl hover:bg-surface-variant/20 transition-colors glow-hover relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: '48px' }}>
                    error
                  </span>
                </div>
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-1">Failed Posts</h3>
                <p className="font-display-lg text-display-lg text-error font-bold">{stats?.failed_posts ?? '—'}</p>
              </div>
            </div>

            <div className="md:col-span-8 glass-panel rounded-2xl p-6 flex flex-col glow-hover">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2 font-semibold">
                  <span className="material-symbols-outlined text-primary">upcoming</span>
                  Upcoming Posts
                </h3>
                <Link to="/calendar" className="text-primary font-label-md text-label-md hover:underline">
                  View Calendar
                </Link>
              </div>

              <div className="space-y-4 flex-1">
                {upcomingPosts.length === 0 ? (
                  <p className="text-on-surface-variant font-body-sm text-body-sm">No scheduled posts yet.</p>
                ) : (
                  upcomingPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-surface-container/50 border border-outline-variant/20 p-4 rounded-xl flex gap-4 hover:border-primary/50 transition-colors group"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-outline-variant/30 bg-surface flex items-center justify-center">
                        {post.media[0] ? (
                          <img className="w-full h-full object-cover" alt="Post media" src={post.media[0].url} />
                        ) : (
                          <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: '32px' }}>
                            format_quote
                          </span>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-body-sm text-body-sm text-on-background line-clamp-2">{post.caption || 'Untitled post'}</p>
                          <button onClick={() => navigate('/create')} className="text-on-surface-variant hover:text-primary transition-colors shrink-0">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                              edit
                            </span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-2 items-center">
                            <div className="status-chip-emerald px-2 py-0.5 rounded font-label-md text-[10px] uppercase tracking-wider font-semibold">
                              Scheduled
                            </div>
                            <span className="font-label-md text-label-md text-on-surface-variant">
                              {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <div className="flex -space-x-1">
                            {post.targets.map((t) => {
                              const meta = PLATFORM_META[t.platform];
                              return (
                                <div
                                  key={t.id}
                                  className="w-6 h-6 rounded-full flex items-center justify-center border"
                                  style={{ backgroundColor: `${meta?.color}1A`, borderColor: `${meta?.color}4D`, color: meta?.color }}
                                >
                                  <span className="material-symbols-outlined text-[12px]">{meta?.icon}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-6" id="activity">
              <div className="glass-panel rounded-2xl p-6 glow-hover flex-1">
                <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2 mb-6 font-semibold">
                  <span className="material-symbols-outlined text-tertiary">history</span>
                  Recent Activity
                </h3>
                {activity.length === 0 ? (
                  <p className="text-on-surface-variant font-body-sm text-body-sm">No activity yet.</p>
                ) : (
                  <div className="relative border-l border-outline-variant/20 ml-3 space-y-6">
                    {activity.map((item, idx) => (
                      <div key={idx} className="relative pl-6">
                        <div
                          className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-background ${
                            item.level === 'success' ? 'bg-secondary' : 'bg-error'
                          }`}
                        ></div>
                        <p className={`font-body-sm text-body-sm mb-0.5 ${item.level === 'error' ? 'text-error' : 'text-on-background'}`}>{item.message}</p>
                        <p className="font-label-md text-label-md text-on-surface-variant">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-12 glass-panel rounded-2xl p-6 glow-hover" id="analytics">
              <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2 mb-6 font-semibold">
                <span className="material-symbols-outlined text-primary">dynamic_feed</span>
                Channel Overview
              </h3>
              {channels.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm text-body-sm">No connected accounts yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {channels.map((ch) => {
                    const meta = PLATFORM_META[ch.platform] || { label: ch.platform, icon: 'share', color: '#888' };
                    return (
                      <div
                        key={`${ch.platform}-${ch.display_name}`}
                        className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 hover:bg-surface-variant/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center border font-bold"
                            style={{ backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}4D`, color: meta.color }}
                          >
                            <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${ch.status === 'connected' ? 'bg-secondary shadow-[0_0_8px_#4edea3]' : 'bg-error'}`}></div>
                        </div>
                        <p className="font-label-md text-label-md text-on-surface-variant mb-1">{meta.label}</p>
                        <p className="font-body-lg text-body-lg text-on-background font-bold capitalize">{ch.status}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
