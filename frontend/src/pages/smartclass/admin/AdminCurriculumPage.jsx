import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../../lib/smartClassAuth';

export default function AdminCurriculumPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Chapter Form
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');

  // Add Class Form
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Add Subject Form
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const loadClassesAndSubjects = async () => {
    try {
      const [clsData, subData] = await Promise.all([
        apiFetch('/library/classes'),
        apiFetch('/library/subjects'),
      ]);
      setClasses(clsData);
      setSubjects(subData);
      if (!selectedClassId && clsData.length > 0) setSelectedClassId(String(clsData[0].id));
      if (!selectedSubjectId && subData.length > 0) setSelectedSubjectId(String(subData[0].id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load curriculum');
    }
  };

  useEffect(() => {
    loadClassesAndSubjects();
  }, []);

  const loadChapters = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    setLoading(true);
    try {
      const chaps = await apiFetch(`/library/classes/${selectedClassId}/subjects/${selectedSubjectId}/chapters`);
      setChapters(chaps);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChapters();
  }, [selectedClassId, selectedSubjectId]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setError('');
    try {
      const created = await apiFetch(`/library/classes?name=${encodeURIComponent(newClassName.trim())}`, {
        method: 'POST',
      });
      setClasses((prev) => [...prev, created]);
      setSelectedClassId(String(created.id));
      setNewClassName('');
      setShowAddClass(false);
      setSuccessMsg(`Class ${created.name} added!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create class');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setError('');
    try {
      const created = await apiFetch(`/library/subjects?name=${encodeURIComponent(newSubjectName.trim())}`, {
        method: 'POST',
      });
      setSubjects((prev) => [...prev, created]);
      setSelectedSubjectId(String(created.id));
      setNewSubjectName('');
      setShowAddSubject(false);
      setSuccessMsg(`Subject ${created.name} added!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create subject');
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    setError('');
    try {
      await apiFetch('/library/chapters', {
        method: 'POST',
        body: {
          class_id: Number(selectedClassId),
          subject_id: Number(selectedSubjectId),
          name: newChapterName.trim(),
        },
      });
      setNewChapterName('');
      setShowAddChapter(false);
      loadChapters();
      setSuccessMsg('Chapter added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapId, name) => {
    if (!window.confirm(`Delete chapter "${name}"?`)) return;
    try {
      await apiFetch(`/library/chapters/${chapId}`, { method: 'DELETE' });
      setChapters((prev) => prev.filter((c) => c.id !== chapId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete chapter');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Administration' }, { label: 'Curriculum Structure' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold mb-2">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>School Administrator Tool</span>
            </div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
              Curriculum Structure Management
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Add and organize Classes, Subjects, and Chapters for the institutional teaching library.
            </p>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Management Toolbar: Class & Subject Picker + Quick Adds */}
          <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Target Class / Grade
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddClass((v) => !v)}
                    className="text-xs text-secondary hover:underline font-bold"
                  >
                    + Add New Class
                  </button>
                </div>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.name}
                    </option>
                  ))}
                </select>

                {showAddClass && (
                  <form onSubmit={handleAddClass} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g. Nursery, KG, IX..."
                      className="flex-1 bg-surface-dim border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-secondary text-on-secondary-container rounded-lg text-xs font-bold"
                    >
                      Save Class
                    </button>
                  </form>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Target Subject
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSubject((v) => !v)}
                    className="text-xs text-secondary hover:underline font-bold"
                  >
                    + Add New Subject
                  </button>
                </div>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {showAddSubject && (
                  <form onSubmit={handleAddSubject} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Sanskrit, Robotics..."
                      className="flex-1 bg-surface-dim border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-secondary text-on-secondary-container rounded-lg text-xs font-bold"
                    >
                      Save Subject
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>

          {/* Chapters Structure List */}
          <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
              <h2 className="font-headline-sm text-base md:text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">format_list_numbered</span>
                <span>Curriculum Chapters ({chapters.length})</span>
              </h2>

              <button
                type="button"
                onClick={() => setShowAddChapter((v) => !v)}
                className="px-4 py-2 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Chapter</span>
              </button>
            </div>

            {showAddChapter && (
              <form onSubmit={handleAddChapter} className="p-4 bg-surface-container rounded-2xl border border-secondary/30 space-y-3">
                <label className="text-xs font-bold text-on-surface-variant block">New Chapter Title</label>
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="e.g. Real Numbers / Pair of Linear Equations..."
                  className="w-full bg-surface-dim border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChapter(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-secondary text-on-secondary-container rounded-lg text-xs font-bold"
                  >
                    Create Chapter
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                <span>Loading chapters...</span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant text-sm">
                No chapters found for this Class and Subject. Click "Add Chapter" above.
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chap, idx) => (
                  <div
                    key={chap.id}
                    className="p-4 bg-surface-container rounded-xl border border-outline-variant/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-surface-dim flex items-center justify-center font-black text-xs text-secondary border border-outline-variant/20">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{chap.name}</h3>
                        <p className="text-xs text-on-surface-variant">
                          {chap.parts?.length || 0} Topics • {chap.resources_count || 0} Resources
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/smart-class/curriculum/${selectedClassId}/${selectedSubjectId}/${chap.id}`)
                        }
                        className="px-3 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-secondary text-xs font-bold transition-colors"
                      >
                        Open Workspace
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(chap.id, chap.name)}
                        className="p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors"
                        title="Delete Chapter"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
