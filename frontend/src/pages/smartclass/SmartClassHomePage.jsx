import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import PresentationViewerModal from '../../components/library/PresentationViewerModal';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';
import { smartClassStore } from '../../lib/smartClassStore';

export default function SmartClassHomePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  // Data states
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // "What are you teaching?" Quick Launch Selector
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [quickMaterials, setQuickMaterials] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Dynamic sections
  const [continueLesson, setContinueLesson] = useState(null);
  const [recentLessons, setRecentLessons] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Modals & Present Mode
  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [presentingPresentation, setPresentingPresentation] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Load initial data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clsData, subData, recentMats] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
          apiFetch('/library/materials?limit=8').catch(() => []),
        ]);
        setClasses(clsData);
        setSubjects(subData);
        setRecentlyAdded(recentMats.slice(0, 6));

        // Load local store items
        const savedContinue = smartClassStore.getContinueTeaching();
        if (savedContinue) {
          setContinueLesson(savedContinue);
        } else if (clsData.length > 0 && subData.length > 0) {
          // Default initial continue card
          setContinueLesson({
            class_id: clsData[0].id,
            class_name: clsData[0].name,
            subject_id: subData[0].id,
            subject_name: subData[0].name,
            chapter_name: 'Introduction & Fundamentals',
            part_title: 'Core Concepts Overview',
          });
        }

        setRecentLessons(smartClassStore.getRecentLessons());
        setFavorites(smartClassStore.getFavorites());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load teaching library');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // When class or subject changes in the Quick Launch selector
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setChapters([]);
      setSelectedChapterId('');
      setQuickMaterials([]);
      return;
    }

    setLoadingChapters(true);
    apiFetch(`/library/classes/${selectedClassId}/subjects/${selectedSubjectId}/chapters`)
      .then((data) => {
        setChapters(data);
        if (data.length > 0) {
          setSelectedChapterId(String(data[0].id));
        } else {
          setSelectedChapterId('');
          setQuickMaterials([]);
        }
      })
      .catch(() => setChapters([]))
      .finally(() => setLoadingChapters(false));
  }, [selectedClassId, selectedSubjectId]);

  // When chapter changes in the Quick Launch selector
  useEffect(() => {
    if (!selectedChapterId) {
      setQuickMaterials([]);
      return;
    }
    setLoadingMaterials(true);
    apiFetch(`/library/materials?chapter_id=${selectedChapterId}`)
      .then((data) => setQuickMaterials(data))
      .catch(() => setQuickMaterials([]))
      .finally(() => setLoadingMaterials(false));
  }, [selectedChapterId]);

  // Handlers for opening & presenting
  const handleOpen = (material) => {
    smartClassStore.setContinueTeaching({
      class_id: material.class_id,
      class_name: material.class_name,
      subject_id: material.subject_id,
      subject_name: material.subject_name,
      chapter_id: material.chapter_id,
      chapter_name: material.chapter_name,
      part_id: material.part_id,
      part_title: material.part_title,
    });
    setContinueLesson(smartClassStore.getContinueTeaching());

    const isPres =
      (material.resource_type || '').toLowerCase() === 'presentation' ||
      (material.media_type || '').toLowerCase() === 'document' ||
      (material.slide_count && material.slide_count > 0) ||
      (material.slide_urls && material.slide_urls.length > 0) ||
      (material.title && material.title.toLowerCase().match(/\.(ppt|pptx)$/));

    if (isPres) {
      setPresentingPresentation(material);
    } else if (material.media_type === 'video') {
      setPlayingVideo(material);
    } else if (material.media_type === 'image') {
      setViewingImage(material);
    } else if (material.file_url) {
      window.open(material.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePresent = (material) => {
    smartClassStore.setContinueTeaching({
      class_id: material.class_id,
      class_name: material.class_name,
      subject_id: material.subject_id,
      subject_name: material.subject_name,
      chapter_id: material.chapter_id,
      chapter_name: material.chapter_name,
      part_id: material.part_id,
      part_title: material.part_title,
    });
    setContinueLesson(smartClassStore.getContinueTeaching());
    setPresentingMaterial(material);
  };

  const handleContinueTeaching = () => {
    if (!continueLesson) return;
    if (continueLesson.chapter_id) {
      navigate(
        `/smart-class/curriculum/${continueLesson.class_id}/${continueLesson.subject_id}/${continueLesson.chapter_id}`
      );
    } else if (continueLesson.class_id && continueLesson.subject_id) {
      navigate(`/smart-class/curriculum/${continueLesson.class_id}/${continueLesson.subject_id}`);
    } else {
      navigate('/smart-class/classes');
    }
  };

  const selectedClassObj = classes.find((c) => String(c.id) === String(selectedClassId));
  const selectedSubjectObj = subjects.find((s) => String(s.id) === String(selectedSubjectId));
  const selectedChapterObj = chapters.find((c) => String(c.id) === String(selectedChapterId));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-8">
          {/* Header Banner & Quick Resume */}
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
            {/* Title & Mission */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold mb-3 w-fit">
                <span className="material-symbols-outlined text-[16px]">school</span>
                <span>Institutional Smart Class & Teaching Library</span>
              </div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">
                Digital Teaching Library
              </h1>
              <p className="font-body-md text-on-surface-variant mt-2 max-w-xl">
                Prepare lessons beforehand, explore structured curricula, and present interactive materials on classroom screens.
              </p>
            </div>

            {/* CONTINUE TEACHING CARD */}
            {continueLesson && (
              <div className="lg:w-[420px] bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-5 rounded-2xl border border-secondary/30 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                {/* Subtle glowing accent */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                      Continue Teaching
                    </span>
                    <span className="text-[11px] font-medium text-on-surface-variant/80">Active Lesson</span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
                      <span className="px-2 py-0.5 rounded bg-secondary/20 text-secondary font-bold">
                        Class {continueLesson.class_name || '10'}
                      </span>
                      <span>•</span>
                      <span>{continueLesson.subject_name || 'Mathematics'}</span>
                    </div>

                    <h3 className="font-headline-sm text-base md:text-lg font-bold text-on-surface truncate">
                      {continueLesson.chapter_name || 'Pair of Linear Equations'}
                    </h3>

                    {continueLesson.part_title && (
                      <p className="text-xs text-secondary-fixed-dim font-medium truncate mt-0.5">
                        Topic: {continueLesson.part_title}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinueTeaching}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold text-sm hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform group-hover:scale-[1.01]"
                >
                  <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  <span>Continue Lesson</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* "WHAT ARE YOU TEACHING?" QUICK LAUNCH SELECTOR */}
          <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 shadow-md flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/10">
              <div>
                <h2 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">explore</span>
                  <span>What are you teaching?</span>
                </h2>
                <p className="text-xs md:text-sm text-on-surface-variant">
                  Pick a Class, Subject, and Chapter to instantly surface teaching resources.
                </p>
              </div>

              {selectedClassId && selectedSubjectId && selectedChapterId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/smart-class/curriculum/${selectedClassId}/${selectedSubjectId}/${selectedChapterId}`
                    )
                  }
                  className="px-4 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-secondary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-secondary/30"
                >
                  <span>Open Full Chapter Workspace</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>

            {/* 3 Step Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Step 1: Class */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  1. Select Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-on-surface font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all cursor-pointer text-sm"
                >
                  <option value="">Choose Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Subject */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  2. Select Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedClassId}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-on-surface font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">Choose Subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Chapter */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                  3. Select Chapter
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={!selectedClassId || !selectedSubjectId || chapters.length === 0}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-on-surface font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingChapters
                      ? 'Loading chapters...'
                      : chapters.length === 0
                      ? 'No chapters found'
                      : 'Choose Chapter...'}
                  </option>
                  {chapters.map((chap, idx) => (
                    <option key={chap.id} value={chap.id}>
                      {String(idx + 1).padStart(2, '0')} {chap.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Results Area */}
            {selectedClassId && selectedSubjectId && selectedChapterId && (
              <div className="mt-2 pt-4 border-t border-outline-variant/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <span className="text-secondary">Class {selectedClassObj?.name}</span>
                    <span>•</span>
                    <span>{selectedSubjectObj?.name}</span>
                    <span>•</span>
                    <span className="text-on-surface font-headline-sm">{selectedChapterObj?.name}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {quickMaterials.length} resource{quickMaterials.length === 1 ? '' : 's'}
                  </span>
                </div>

                {loadingMaterials ? (
                  <div className="py-8 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    <span>Loading teaching material...</span>
                  </div>
                ) : quickMaterials.length === 0 ? (
                  <div className="py-8 text-center bg-surface-container-high/30 rounded-xl border border-dashed border-outline-variant/30 p-6">
                    <span className="material-symbols-outlined text-[36px] text-on-surface-variant/60 mb-2">
                      video_library
                    </span>
                    <p className="text-sm text-on-surface-variant font-medium">
                      No resources in this chapter yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/smart-class/add-material')}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-secondary text-on-secondary-container text-xs font-bold hover:opacity-90 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add First Resource</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickMaterials.slice(0, 6).map((mat) => (
                      <ResourceCard
                        key={mat.id}
                        material={mat}
                        onOpen={handleOpen}
                        onPresent={handlePresent}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* MY CLASSES OVERVIEW CARDS */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">class</span>
                  <span>My Classes & Subjects</span>
                </h2>
                <p className="text-xs md:text-sm text-on-surface-variant">
                  Quickly access curriculum structures for your assigned grades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/smart-class/classes')}
                className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {classes.slice(0, 4).map((c, idx) => {
                const subjectName = subjects[idx % subjects.length]?.name || 'Mathematics';
                const subjectId = subjects[idx % subjects.length]?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (subjectId) {
                        navigate(`/smart-class/curriculum/${c.id}/${subjectId}`);
                      } else {
                        navigate('/smart-class/classes');
                      }
                    }}
                    className="group bg-surface-container-low hover:bg-surface-container p-5 rounded-2xl border border-outline-variant/20 hover:border-secondary/50 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary border border-secondary/30">
                          Class {c.name}
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary group-hover:translate-x-1 transition-all text-[20px]">
                          arrow_forward
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-secondary transition-colors mb-2">
                        {subjectName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-3 border-t border-outline-variant/10">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        <span>{c.chapters_count || 12} Chapters</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">video_library</span>
                        <span>{c.resources_count || 48} Resources</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* RECENTLY ADDED MATERIAL */}
          {recentlyAdded.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">new_releases</span>
                    <span>Recently Added Material</span>
                  </h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">
                    Fresh teaching explanations, worksheets, and videos added to the school library.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/smart-class/library')}
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Library</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyAdded.map((mat) => (
                  <ResourceCard
                    key={mat.id}
                    material={mat}
                    showCurriculumContext
                    onOpen={handleOpen}
                    onPresent={handlePresent}
                  />
                ))}
              </div>
            </section>
          )}

          {/* FAVORITES SECTION (if any exist) */}
          {favorites.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    <span>Favorite Teaching Materials</span>
                  </h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">
                    Your bookmarked and pinned materials for rapid classroom access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/smart-class/favorites')}
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Favorites</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.slice(0, 3).map((mat) => (
                  <ResourceCard
                    key={mat.id}
                    material={mat}
                    showCurriculumContext
                    onOpen={handleOpen}
                    onPresent={handlePresent}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Presentation Mode Fullscreen Modal */}
      {presentingMaterial && (
        <TeachPresentMode
          material={presentingMaterial}
          allMaterialsInTopic={quickMaterials.length > 0 ? quickMaterials : [presentingMaterial]}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      {/* In-App Presentation / PowerPoint Viewer */}
      {presentingPresentation && (
        <PresentationViewerModal
          material={presentingPresentation}
          onClose={() => setPresentingPresentation(null)}
        />
      )}

      {/* Standard Modals */}
      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
