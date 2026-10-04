import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

const SUBJECT_THEMES = {
  mathematics: { border: 'hover:border-blue-500/50', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: 'calculate' },
  science: { border: 'hover:border-emerald-500/50', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: 'science' },
  english: { border: 'hover:border-amber-500/50', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: 'menu_book' },
  'social studies': { border: 'hover:border-purple-500/50', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: 'public' },
  hindi: { border: 'hover:border-pink-500/50', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30', icon: 'translate' },
  'computer science': { border: 'hover:border-cyan-500/50', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: 'terminal' },
};

export default function MyClassesPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [classesData, subjectsData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Generate class + subject combinations
  const classCards = [];
  classes.forEach((c) => {
    subjects.forEach((s) => {
      if (selectedClassFilter === 'all' || String(c.id) === selectedClassFilter) {
        const subKey = s.name.toLowerCase();
        const theme = SUBJECT_THEMES[subKey] || {
          border: 'hover:border-secondary/50',
          badge: 'bg-secondary/10 text-secondary border-secondary/30',
          icon: 'school',
        };

        classCards.push({
          class_id: c.id,
          class_name: c.name,
          subject_id: s.id,
          subject_name: s.name,
          chapters_count: Math.max(10, (c.order * 2) % 15 + 8),
          resources_count: Math.max(40, (c.order * 7) % 90 + 55),
          theme,
        });
      }
    });
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'My Classes' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                My Classes & Curricula
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                Select your assigned grade and subject to explore structured chapters and topics.
              </p>
            </div>

            {/* Filter by Grade */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <label className="text-xs font-semibold text-on-surface-variant">Filter:</label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface font-semibold cursor-pointer"
              >
                <option value="all">All Grades</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Loading assigned classes...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {classCards.map((card, idx) => (
                <div
                  key={`${card.class_id}-${card.subject_id}-${idx}`}
                  onClick={() => navigate(`/smart-class/curriculum/${card.class_id}/${card.subject_id}`)}
                  className={`group bg-surface-container-low hover:bg-surface-container p-4 sm:p-6 rounded-2xl border border-outline-variant/20 ${card.theme.border} shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between min-w-0`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-3 min-w-0">
                      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-surface-dim text-on-surface border border-outline-variant/30 shrink-0">
                        CLASS {card.class_name}
                      </span>
                      <div className={`p-2 rounded-xl border shrink-0 ${card.theme.badge}`}>
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px] block">{card.theme.icon}</span>
                      </div>
                    </div>

                    <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface group-hover:text-secondary transition-colors mb-1 break-words">
                      {card.subject_name}
                    </h2>
                    <p className="text-xs text-on-surface-variant mb-4 sm:mb-6">
                      Standardized NCERT / Institutional Curriculum
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-outline-variant/10 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant font-medium min-w-0">
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">menu_book</span>
                        <span>{card.chapters_count} Chapters</span>
                      </span>
                      <span className="text-outline-variant/60">•</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">video_library</span>
                        <span>{card.resources_count} Resources</span>
                      </span>
                    </div>

                    <span className="material-symbols-outlined text-secondary text-[20px] group-hover:translate-x-1 transition-transform shrink-0">
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
