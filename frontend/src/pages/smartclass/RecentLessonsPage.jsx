import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import { smartClassStore } from '../../lib/smartClassStore';

export default function RecentLessonsPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [recents, setRecents] = useState([]);

  useEffect(() => {
    setRecents(smartClassStore.getRecentLessons());
  }, []);

  const handleClear = () => {
    localStorage.removeItem('smartclass_recent_lessons');
    setRecents([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Recent Lessons' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                Recent Lessons & Topics
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Quickly resume your recent teaching sessions and visited chapters.
              </p>
            </div>

            {recents.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-error hover:underline cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {recents.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                history
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No recent teaching sessions
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                As you open and present chapters and topics, they will appear here for fast one-click resumption.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/classes')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Browse My Classes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recents.map((item, idx) => (
                <div
                  key={`${item.class_id}-${item.chapter_id}-${idx}`}
                  onClick={() => {
                    if (item.chapter_id) {
                      navigate(`/smart-class/curriculum/${item.class_id}/${item.subject_id}/${item.chapter_id}`);
                    } else {
                      navigate(`/smart-class/curriculum/${item.class_id}/${item.subject_id}`);
                    }
                  }}
                  className="group bg-surface-container-low hover:bg-surface-container p-5 rounded-2xl border border-outline-variant/20 hover:border-secondary/50 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                        Class {item.class_name}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/70">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant font-medium">{item.subject_name}</p>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface group-hover:text-secondary transition-colors mt-1 mb-1 truncate">
                      {item.chapter_name || 'Chapter'}
                    </h3>
                    {item.part_title && (
                      <p className="text-xs text-secondary-fixed-dim truncate">
                        Topic: {item.part_title}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between text-xs text-secondary font-bold mt-4">
                    <span>Resume Lesson</span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
