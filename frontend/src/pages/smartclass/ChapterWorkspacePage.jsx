import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import PresentationViewerModal from '../../components/library/PresentationViewerModal';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';
import { smartClassStore } from '../../lib/smartClassStore';

const CATEGORIES = [
  {
    key: 'all',
    label: 'All Material',
    icon: 'grid_view',
    description: 'All learning experiences for this topic',
  },
  {
    key: 'learn',
    label: 'Learn',
    icon: 'school',
    description: 'Teacher Explanations, Concept Videos, Book Material',
    subtypes: ['teacher_explanation', 'concept', 'video', 'book_extract', 'book_material'],
  },
  {
    key: 'understand',
    label: 'Understand',
    icon: 'lightbulb',
    description: 'Visual Explanations, Worked Examples, Real-Life Applications',
    subtypes: ['example', 'worked_example', 'visual_explanation', 'alternative_method'],
  },
  {
    key: 'practice',
    label: 'Practice',
    icon: 'assignment',
    description: 'NCERT Questions, Worksheets, Exam & Challenge Problems',
    subtypes: ['practice', 'worksheet', 'question_set', 'ncert_questions', 'exam_questions'],
  },
  {
    key: 'reference',
    label: 'Reference',
    icon: 'menu_book',
    description: 'PDF Notes, Diagrams, Formula Sheets, Teacher Notes',
    subtypes: ['reference', 'pdf_notes', 'image', 'diagram', 'teacher_notes', 'link'],
  },
];

export default function ChapterWorkspacePage() {
  const { classId, subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [chapterMaterials, setChapterMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Category Filter inside Topic Hub
  const [activeCategory, setActiveCategory] = useState('all');

  // Modals & Present Mode
  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [presentingPresentation, setPresentingPresentation] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // New Part Inline Creator
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPartTitle, setNewPartTitle] = useState('');
  const [creatingPart, setCreatingPart] = useState(false);

  // Load Classes, Subjects, and Chapter Info
  useEffect(() => {
    (async () => {
      try {
        const [clsData, subData, chapsData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
          apiFetch(`/library/classes/${classId}/subjects/${subjectId}/chapters`),
        ]);
        setClasses(clsData);
        setSubjects(subData);
        setChapters(chapsData);

        const currentChap = chapsData.find((c) => String(c.id) === String(chapterId));
        if (currentChap && currentChap.parts && currentChap.parts.length > 0) {
          setSelectedPartId(String(currentChap.parts[0].id));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load chapter');
      }
    })();
  }, [classId, subjectId, chapterId]);

  // Load All Materials for this Chapter
  const loadMaterials = async () => {
    if (!chapterId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/library/materials?chapter_id=${chapterId}`);
      setChapterMaterials(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [chapterId]);

  const currentClass = classes.find((c) => String(c.id) === String(classId));
  const currentSubject = subjects.find((s) => String(s.id) === String(subjectId));
  const currentChapter = chapters.find((c) => String(c.id) === String(chapterId));
  const sortedParts = useMemo(
    () => (currentChapter?.parts || []).slice().sort((a, b) => a.part_number - b.part_number),
    [currentChapter]
  );
  const currentPart = sortedParts.find((p) => String(p.id) === String(selectedPartId)) || sortedParts[0];

  // Materials in Selected Topic
  const topicMaterials = useMemo(() => {
    if (!currentPart) return [];
    return chapterMaterials.filter((m) => String(m.part_id) === String(currentPart.id));
  }, [chapterMaterials, currentPart]);

  // Categorize Materials in Selected Topic
  const categorizedMaterials = useMemo(() => {
    const buckets = {
      learn: [],
      understand: [],
      practice: [],
      reference: [],
    };

    topicMaterials.forEach((m) => {
      const cat = (m.category || '').toLowerCase();
      const resType = (m.resource_type || m.media_type || '').toLowerCase();

      if (cat === 'learn' || cat === 'teacher_explanation' || cat === 'concept' || cat === 'book_material') {
        buckets.learn.push(m);
      } else if (cat === 'understand' || cat === 'example' || cat === 'worked_example') {
        buckets.understand.push(m);
      } else if (cat === 'practice' || cat === 'worksheet' || cat === 'question_set') {
        buckets.practice.push(m);
      } else if (cat === 'reference' || cat === 'pdf_notes' || cat === 'teacher_notes') {
        buckets.reference.push(m);
      } else {
        // Map based on media type fallback
        if (resType === 'video' || resType === 'audio') {
          buckets.learn.push(m);
        } else if (resType === 'pdf' || resType === 'document') {
          buckets.reference.push(m);
        } else {
          buckets.learn.push(m);
        }
      }
    });

    return buckets;
  }, [topicMaterials]);

  // Filtered displayed materials
  const displayedMaterials = useMemo(() => {
    if (activeCategory === 'all') return topicMaterials;
    return categorizedMaterials[activeCategory] || [];
  }, [activeCategory, topicMaterials, categorizedMaterials]);

  // Set active continue lesson on topic selection
  useEffect(() => {
    if (currentClass && currentSubject && currentChapter && currentPart) {
      smartClassStore.setContinueTeaching({
        class_id: currentClass.id,
        class_name: currentClass.name,
        subject_id: currentSubject.id,
        subject_name: currentSubject.name,
        chapter_id: currentChapter.id,
        chapter_name: currentChapter.name,
        part_id: currentPart.id,
        part_title: currentPart.title,
      });
    }
  }, [currentClass, currentSubject, currentChapter, currentPart]);

  // Create new Topic Part
  const handleCreatePart = async (e) => {
    e.preventDefault();
    if (!newPartTitle.trim()) return;
    setCreatingPart(true);
    try {
      const created = await apiFetch('/library/parts', {
        method: 'POST',
        body: {
          chapter_id: Number(chapterId),
          title: newPartTitle.trim(),
        },
      });
      // Refresh chapter
      const updatedChaps = await apiFetch(`/library/classes/${classId}/subjects/${subjectId}/chapters`);
      setChapters(updatedChaps);
      setSelectedPartId(String(created.id));
      setNewPartTitle('');
      setShowAddPart(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create topic');
    } finally {
      setCreatingPart(false);
    }
  };

  const handleOpen = (material) => {
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
    setPresentingMaterial(material);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[
          { label: 'Classes', path: '/smart-class/classes' },
          { label: `Class ${currentClass?.name || ''}`, path: `/smart-class/curriculum/${classId}/${subjectId}` },
          { label: currentSubject?.name || '', path: `/smart-class/curriculum/${classId}/${subjectId}` },
          { label: currentChapter?.name || 'Chapter' },
        ]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      {/* Main Chapter Workspace Layout: 2-Column Responsive */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        {/* LEFT COLUMN: CHAPTER TOPIC SELECTOR */}
        <aside className="w-full lg:w-80 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-outline-variant/15 flex flex-col shrink-0 p-4 lg:p-5 overflow-y-auto max-h-[40vh] lg:max-h-full">
          {/* Chapter Info Header */}
          <div className="pb-4 border-b border-outline-variant/10 mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-secondary px-2.5 py-0.5 rounded bg-secondary/10 border border-secondary/20">
              Chapter Workspace
            </span>
            <h2 className="font-headline-sm text-base md:text-lg font-bold text-on-surface mt-2 leading-snug">
              {currentChapter?.name}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Class {currentClass?.name} • {currentSubject?.name}
            </p>
          </div>

          {/* Topics List Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
              Topics / Parts ({sortedParts.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddPart((v) => !v)}
              className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Topic</span>
            </button>
          </div>

          {/* New Topic Inline Creator */}
          {showAddPart && (
            <form onSubmit={handleCreatePart} className="mb-3 p-3 bg-surface-container rounded-xl border border-secondary/30 space-y-2">
              <label className="text-[11px] font-bold text-on-surface-variant block">New Topic Title</label>
              <input
                type="text"
                value={newPartTitle}
                onChange={(e) => setNewPartTitle(e.target.value)}
                placeholder="e.g. Graphical Method..."
                className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-secondary"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPart(false)}
                  className="px-2.5 py-1 rounded text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPart || !newPartTitle.trim()}
                  className="px-3 py-1 bg-secondary text-on-secondary-container rounded text-xs font-bold disabled:opacity-50"
                >
                  {creatingPart ? 'Adding...' : 'Add Topic'}
                </button>
              </div>
            </form>
          )}

          {/* Topics List Navigation */}
          <div className="flex-1 space-y-1.5 pr-1">
            {sortedParts.length === 0 ? (
              <p className="text-xs text-on-surface-variant/70 italic p-3 text-center">
                No topics yet. Click "New Topic" above to start.
              </p>
            ) : (
              sortedParts.map((part, idx) => {
                const isActive = String(part.id) === String(currentPart?.id);
                const partMatCount = chapterMaterials.filter((m) => String(m.part_id) === String(part.id)).length;

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartId(String(part.id));
                      setActiveCategory('all');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group ${
                      isActive
                        ? 'bg-secondary/15 border-secondary text-secondary font-bold shadow-sm'
                        : 'bg-surface-container/40 border-outline-variant/10 hover:bg-surface-variant/40 text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-surface-dim flex items-center justify-center shrink-0 font-black text-[11px] text-on-surface-variant">
                        {idx + 1}
                      </span>
                      <span className="text-xs md:text-sm font-semibold truncate leading-tight">
                        {part.title}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-secondary text-on-secondary-container'
                          : 'bg-surface-dim text-on-surface-variant group-hover:text-on-surface'
                      }`}
                    >
                      {partMatCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Add Resource to Chapter */}
          <div className="pt-4 border-t border-outline-variant/10 mt-4">
            <button
              type="button"
              onClick={() => navigate('/smart-class/add-material')}
              className="w-full py-2.5 px-3 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-outline-variant/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Resource to Chapter</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: TOPIC LEARNING HUB */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto pb-32 md:pb-24">
          <div className="p-4 md:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
            {error && (
              <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
                {error}
              </div>
            )}

            {currentPart ? (
              <>
                {/* Topic Banner: ONE TOPIC — MULTIPLE WAYS TO LEARN IT */}
                <div className="bg-gradient-to-r from-surface-container-high to-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                      <span>Topic {sortedParts.findIndex((p) => p.id === currentPart.id) + 1}</span>
                      <span>•</span>
                      <span>Topic Learning Hub</span>
                    </div>

                    <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">
                      {currentPart.title}
                    </h1>

                    <p className="text-xs md:text-sm text-on-surface-variant mt-1">
                      Explore this concept through multiple learning pathways (Explanation, Worked Examples, Practice, Notes).
                    </p>
                  </div>

                  {/* Teach / Present Topic Button */}
                  {topicMaterials.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePresent(topicMaterials[0])}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold text-sm hover:opacity-95 shadow-lg flex items-center gap-2 shrink-0 cursor-pointer transition-transform hover:scale-105"
                      title="Launch Fullscreen Classroom Mode for this Topic"
                    >
                      <span className="material-symbols-outlined text-[20px]">cast_for_education</span>
                      <span>Teach This Topic</span>
                    </button>
                  )}
                </div>

                {/* 4 LEARNING CATEGORIES TABS */}
                <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/15 pb-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.key;
                    const count =
                      cat.key === 'all'
                        ? topicMaterials.length
                        : (categorizedMaterials[cat.key] || []).length;

                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-secondary/15 border-secondary text-secondary shadow-sm'
                            : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-variant/40 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {cat.icon}
                        </span>
                        <span>{cat.label}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-secondary text-on-secondary-container' : 'bg-surface-dim text-on-surface-variant'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Materials Grid / Category Sections */}
                {loading ? (
                  <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    <span>Loading resources...</span>
                  </div>
                ) : displayedMaterials.length === 0 ? (
                  <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                      menu_book
                    </span>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                      No materials in this category yet
                    </h3>
                    <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                      Add a teacher explanation, video, worked example, or practice worksheet for "{currentPart.title}".
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/smart-class/add-material')}
                      className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Add Resource to "{currentPart.title}"</span>
                    </button>
                  </div>
                ) : activeCategory === 'all' ? (
                  /* ALL VIEW: Show structured categorized sections */
                  <div className="flex flex-col gap-8">
                    {/* 1. LEARN SECTION */}
                    {categorizedMaterials.learn.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-teal-400">school</span>
                            <span>Learn — Explanations & Concepts</span>
                          </h3>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {categorizedMaterials.learn.length} resource{categorizedMaterials.learn.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categorizedMaterials.learn.map((m) => (
                            <ResourceCard
                              key={m.id}
                              material={m}
                              onOpen={handleOpen}
                              onPresent={handlePresent}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 2. UNDERSTAND SECTION */}
                    {categorizedMaterials.understand.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400">lightbulb</span>
                            <span>Understand — Worked Examples & Visuals</span>
                          </h3>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {categorizedMaterials.understand.length} resource{categorizedMaterials.understand.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categorizedMaterials.understand.map((m) => (
                            <ResourceCard
                              key={m.id}
                              material={m}
                              onOpen={handleOpen}
                              onPresent={handlePresent}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 3. PRACTICE SECTION */}
                    {categorizedMaterials.practice.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-400">assignment</span>
                            <span>Practice — NCERT, Worksheets & Questions</span>
                          </h3>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {categorizedMaterials.practice.length} resource{categorizedMaterials.practice.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categorizedMaterials.practice.map((m) => (
                            <ResourceCard
                              key={m.id}
                              material={m}
                              onOpen={handleOpen}
                              onPresent={handlePresent}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 4. REFERENCE SECTION */}
                    {categorizedMaterials.reference.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">menu_book</span>
                            <span>Reference — Notes, Diagrams & External Links</span>
                          </h3>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {categorizedMaterials.reference.length} resource{categorizedMaterials.reference.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categorizedMaterials.reference.map((m) => (
                            <ResourceCard
                              key={m.id}
                              material={m}
                              onOpen={handleOpen}
                              onPresent={handlePresent}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  /* SINGLE CATEGORY FILTER VIEW */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedMaterials.map((m) => (
                      <ResourceCard
                        key={m.id}
                        material={m}
                        onOpen={handleOpen}
                        onPresent={handlePresent}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-on-surface-variant text-sm">
                Please create or select a topic to view its learning material.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Presentation Mode Fullscreen Modal */}
      {presentingMaterial && (
        <TeachPresentMode
          material={presentingMaterial}
          allMaterialsInTopic={topicMaterials.length > 0 ? topicMaterials : [presentingMaterial]}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      {/* In-App Presentation / PowerPoint Viewer */}
      {presentingPresentation && (
        <PresentationViewerModal
          material={presentingPresentation}
          onClose={() => setPresentingPresentation(null)}
          onMaterialUpdated={() => loadMaterials()}
        />
      )}

      {/* Standard Modals */}
      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
