import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

export default function ContentCoveragePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [coverageData, setCoverageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        if (clsData.length > 0) setSelectedClassId(String(clsData[0].id));
        if (subData.length > 0) setSelectedSubjectId(String(subData[0].id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load options');
      }
    })();
  }, []);

  // Load Coverage when Class or Subject changes
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;

    setLoading(true);
    apiFetch(`/library/coverage?class_id=${selectedClassId}&subject_id=${selectedSubjectId}`)
      .then(setCoverageData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load coverage'))
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSubjectId]);

  const selectedClassObj = classes.find((c) => String(c.id) === String(selectedClassId));
  const selectedSubjectObj = subjects.find((s) => String(s.id) === String(selectedSubjectId));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Content Coverage' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                <span>Curriculum Health & Quality Audit</span>
              </div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                Content Coverage Matrix
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Audit teaching completeness based on essential learning pathways (Explanations, Worked Examples, Practice, Worksheets, Revision).
              </p>
            </div>

            {/* Class & Subject Selectors */}
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
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
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Overview Score Card */}
          {coverageData && (
            <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/20 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Class {selectedClassObj?.name} • {selectedSubjectObj?.name}
                </span>
                <h2 className="font-headline-sm text-2xl font-bold text-on-surface mt-1">
                  Curriculum Health: {coverageData.average_score}%
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  {coverageData.total_chapters} Chapters • {coverageData.total_topics} Topics • {coverageData.total_resources} Total Learning Resources
                </p>
              </div>

              {/* Average Progress Meter */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-32 bg-surface-dim h-3 rounded-full overflow-hidden border border-outline-variant/20">
                  <div
                    className={`h-full rounded-full ${
                      coverageData.average_score >= 75
                        ? 'bg-emerald-400'
                        : coverageData.average_score >= 50
                        ? 'bg-blue-400'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${coverageData.average_score}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/smart-class/add-material')}
                  className="px-4 py-2 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container text-xs font-bold rounded-xl hover:opacity-90 shadow-md cursor-pointer"
                >
                  + Add Missing Material
                </button>
              </div>
            </div>
          )}

          {/* Chapters Coverage Breakdown */}
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Analyzing curriculum coverage...</span>
            </div>
          ) : !coverageData || coverageData.chapters.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                donut_large
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No chapters created yet for this subject
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Start adding chapters and topics to view their learning coverage audit.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/add-material')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                + Add First Material
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {coverageData.chapters.map((chap, idx) => {
                const statusStyles =
                  chap.status === 'Excellent'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : chap.status === 'Good'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : chap.status === 'Needs Material'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30';

                return (
                  <div
                    key={chap.chapter_id}
                    className="bg-surface-container-low p-5 md:p-6 rounded-2xl border border-outline-variant/20 hover:border-secondary/30 transition-all flex flex-col gap-4"
                  >
                    {/* Chapter Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-surface-dim text-on-surface border border-outline-variant/20">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <h3 className="font-headline-sm text-base md:text-lg font-bold text-on-surface">
                            {chap.chapter_name}
                          </h3>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          {chap.topics_count} Topics • {chap.resources_count} Learning Resources
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusStyles}`}>
                          {chap.status} ({chap.score}%)
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/smart-class/curriculum/${selectedClassId}/${selectedSubjectId}/${chap.chapter_id}`
                            )
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-secondary text-xs font-bold transition-colors cursor-pointer border border-outline-variant/20 flex items-center gap-1"
                        >
                          <span>Open Workspace</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          chap.score >= 75
                            ? 'bg-emerald-400'
                            : chap.score >= 50
                            ? 'bg-blue-400'
                            : chap.score > 0
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(5, chap.score)}%` }}
                      />
                    </div>

                    {/* Category Checklist Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-outline-variant/10">
                      {chap.categories.map((cat) => (
                        <div
                          key={cat.category}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                            cat.has_material
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-on-surface'
                              : 'bg-surface-dim border-outline-variant/15 text-on-surface-variant/60'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              cat.has_material ? 'text-emerald-400 font-bold' : 'text-outline-variant'
                            }`}
                          >
                            {cat.has_material ? 'check_circle' : 'cancel'}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{cat.label}</p>
                            <p className="text-[10px] text-on-surface-variant/70">
                              {cat.has_material ? `${cat.count} items available` : 'Missing material'}
                            </p>
                          </div>
                        </div>
                      ))}
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
