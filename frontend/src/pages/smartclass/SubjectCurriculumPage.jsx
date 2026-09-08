import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

export default function SubjectCurriculumPage() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [currentClassId, setCurrentClassId] = useState(classId || '');
  const [currentSubjectId, setCurrentSubjectId] = useState(subjectId || '');
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Load Classes & Subjects
  useEffect(() => {
    (async () => {
      try {
        const [clsData, subData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
        ]);
        setClasses(clsData);
        setSubjects(subData);

        if (!currentClassId && clsData.length > 0) {
          setCurrentClassId(String(clsData[0].id));
        }
        if (!currentSubjectId && subData.length > 0) {
          setCurrentSubjectId(String(subData[0].id));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load curriculum');
      }
    })();
  }, [currentClassId, currentSubjectId]);

  // Load Chapters when class or subject changes
  useEffect(() => {
    if (!currentClassId || !currentSubjectId) return;

    setLoading(true);
    apiFetch(`/library/classes/${currentClassId}/subjects/${currentSubjectId}/chapters`)
      .then((data) => {
        setChapters(data);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load chapters');
      })
      .finally(() => setLoading(false));
  }, [currentClassId, currentSubjectId]);

  const activeClass = classes.find((c) => String(c.id) === String(currentClassId));
  const activeSubject = subjects.find((s) => String(s.id) === String(currentSubjectId));

  const filteredChapters = chapters.filter((chap) =>
    chap.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[
          { label: 'My Classes', path: '/smart-class/classes' },
          { label: `Class ${activeClass?.name || ''}` },
          { label: activeSubject?.name || 'Curriculum' },
        ]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          {/* Top Class & Subject Switcher Header */}
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                <span>Structured Curriculum</span>
                <span>•</span>
                <span>{chapters.length} Chapters Total</span>
              </div>

              <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">
                Class {activeClass?.name} — {activeSubject?.name}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Explore topics, interactive explanations, NCERT exercises, and classroom resources chapter by chapter.
              </p>
            </div>

            {/* Selectors for quick switching */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Class
                </label>
                <select
                  value={currentClassId}
                  onChange={(e) => {
                    setCurrentClassId(e.target.value);
                    navigate(`/smart-class/curriculum/${e.target.value}/${currentSubjectId}`);
                  }}
                  className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Subject
                </label>
                <select
                  value={currentSubjectId}
                  onChange={(e) => {
                    setCurrentSubjectId(e.target.value);
                    navigate(`/smart-class/curriculum/${currentClassId}/${e.target.value}`);
                  }}
                  className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-end">
                <button
                  type="button"
                  onClick={() => navigate('/smart-class/add-material')}
                  className="px-4 py-2 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Material</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter chapters by title (e.g. Linear Equations, Real Numbers)..."
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Chapters List */}
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Loading curriculum structure...</span>
            </div>
          ) : filteredChapters.length === 0 ? (
            <div className="py-12 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/60 mb-2">
                menu_book
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                {searchFilter ? 'No chapters match your search' : 'No chapters created yet for this subject'}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                You can create chapters and upload resources directly using the Add Material tool.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/add-material')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                + Add First Material / Chapter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChapters.map((chap, idx) => {
                const coverageStatus = chap.coverage_label || 'Needs Material';
                const coverageScore = chap.coverage_score || 0;

                const badgeStyles =
                  coverageStatus === 'Excellent'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : coverageStatus === 'Good'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : coverageStatus === 'Needs Material'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30';

                return (
                  <div
                    key={chap.id}
                    onClick={() =>
                      navigate(`/smart-class/curriculum/${currentClassId}/${currentSubjectId}/${chap.id}`)
                    }
                    className="group bg-surface-container-low hover:bg-surface-container p-5 rounded-2xl border border-outline-variant/20 hover:border-secondary/50 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Chapter number & coverage badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-surface-dim text-on-surface border border-outline-variant/30">
                          CHAPTER {String(idx + 1).padStart(2, '0')}
                        </span>

                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyles}`}>
                          {coverageStatus} ({coverageScore}%)
                        </span>
                      </div>

                      {/* Chapter Name */}
                      <h3 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-secondary transition-colors mb-2 leading-snug">
                        {chap.name}
                      </h3>

                      {/* Topics Breakdown Pill List */}
                      {chap.parts && chap.parts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {chap.parts.slice(0, 4).map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded-md bg-surface-dim text-[11px] text-on-surface-variant font-medium truncate max-w-[160px]"
                            >
                              {p.title}
                            </span>
                          ))}
                          {chap.parts.length > 4 && (
                            <span className="px-2 py-0.5 rounded-md bg-surface-dim text-[11px] text-secondary font-semibold">
                              +{chap.parts.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar & Footer */}
                    <div className="pt-3 border-t border-outline-variant/10">
                      {/* Visual coverage bar */}
                      <div className="w-full bg-surface-dim h-1.5 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full ${
                            coverageScore >= 75
                              ? 'bg-emerald-400'
                              : coverageScore >= 50
                              ? 'bg-blue-400'
                              : coverageScore > 0
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.max(8, coverageScore)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">account_tree</span>
                            <span>{chap.topics_count || chap.parts?.length || 0} Topics</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">video_library</span>
                            <span>{chap.resources_count || 0} Resources</span>
                          </span>
                        </div>

                        <span className="text-secondary font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          <span>Open Workspace</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
