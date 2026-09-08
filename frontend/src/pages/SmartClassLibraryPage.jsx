import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../components/layout/SmartClassTopBar';
import VideoPlayerModal from '../components/library/VideoPlayerModal';
import ImageViewerModal from '../components/library/ImageViewerModal';
import { ApiError, apiFetch } from '../lib/smartClassAuth.jsx';

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MEDIA_TYPE_ICON = { video: 'play_circle', image: 'image', pdf: 'picture_as_pdf', document: 'slideshow' };

export default function SmartClassLibraryPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [chapterMaterials, setChapterMaterials] = useState([]);
  const [loadingChapterMaterials, setLoadingChapterMaterials] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState('');
  const [playingMaterial, setPlayingMaterial] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [classesData, subjectsData] = await Promise.all([apiFetch('/library/classes'), apiFetch('/library/subjects')]);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load library');
      }
    })();
  }, []);

  useEffect(() => {
    setChapterId('');
    setChapters([]);
    if (!classId || !subjectId) return;
    apiFetch(`/library/classes/${classId}/subjects/${subjectId}/chapters`)
      .then(setChapters)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load chapters'));
  }, [classId, subjectId]);

  useEffect(() => {
    if (!chapterId) {
      setChapterMaterials([]);
      return;
    }
    setLoadingChapterMaterials(true);
    apiFetch(`/library/materials?chapter_id=${chapterId}`)
      .then(setChapterMaterials)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load videos'))
      .finally(() => setLoadingChapterMaterials(false));
  }, [chapterId]);

  const selectedChapter = chapters.find((c) => String(c.id) === String(chapterId));

  const materialsByPart = useMemo(() => {
    const grouped = new Map();
    for (const material of chapterMaterials) {
      if (!grouped.has(material.part_id)) grouped.set(material.part_id, []);
      grouped.get(material.part_id).push(material);
    }
    return grouped;
  }, [chapterMaterials]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setError('');
    try {
      const results = await apiFetch(`/library/materials?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleOpenMaterial = (material) => {
    if (material.media_type === 'video') {
      setPlayingMaterial(material);
    } else if (material.media_type === 'image') {
      setViewingImage(material);
    } else if (material.file_url) {
      // PDF/PowerPoint: no in-app viewer -- open the file directly in a new tab (browsers render
      // PDFs natively; PowerPoint files download/open via the OS's associated app).
      window.open(material.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderMaterialRow = (material) => (
    <button
      key={material.id}
      type="button"
      onClick={() => handleOpenMaterial(material)}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-variant/40 transition-colors text-left cursor-pointer"
    >
      <div className="w-24 h-14 rounded-md overflow-hidden bg-surface-dim border border-outline-variant/20 shrink-0 flex items-center justify-center">
        {material.thumbnail_url || (material.media_type === 'image' && material.file_url) ? (
          <img src={material.thumbnail_url || material.file_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-on-surface-variant">
            {MEDIA_TYPE_ICON[material.media_type] || 'description'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body-sm text-body-sm text-on-surface truncate">{material.title}</p>
        {material.duration_seconds != null && (
          <p className="font-label-md text-label-md text-on-surface-variant">{formatDuration(material.duration_seconds)}</p>
        )}
      </div>
      <span className="material-symbols-outlined text-primary">
        {material.media_type === 'video' ? 'play_arrow' : material.media_type === 'image' ? 'visibility' : 'open_in_new'}
      </span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">
                Smart Class Library
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Browse classroom videos, images, and documents.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/smart-class/add-video')}
              className="btn-gradient text-white font-label-md text-label-md px-6 py-3 rounded-lg font-semibold flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> Add Video
            </button>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-surface-container-high border border-outline-variant/30 rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
            {searchResults && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {searchResults ? (
            <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-2">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">
                {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
              </h3>
              {searchResults.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant">No videos match your search.</p>
              ) : (
                searchResults.map((m) => (
                  <div key={m.id}>
                    <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                      Class {m.class_name} → {m.subject_name} → {m.chapter_name} → {m.part_title}
                    </p>
                    {renderMaterialRow(m)}
                  </div>
                ))
              )}
            </section>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    <option value="">Select a class…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!classId}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface disabled:opacity-50"
                  >
                    <option value="">Select a subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {classId && subjectId && (
                <section className="bg-surface-container-low rounded-xl p-md card-border">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-3">Chapters</h3>
                  {chapters.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      No chapters yet for this class/subject.{' '}
                      <button type="button" onClick={() => navigate('/smart-class/add-video')} className="text-primary hover:underline cursor-pointer">
                        Add a video
                      </button>{' '}
                      to create one.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {chapters.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChapterId(String(c.id))}
                          className={`px-4 py-2 rounded-full font-label-md text-label-md border transition-colors cursor-pointer ${
                            String(chapterId) === String(c.id)
                              ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                              : 'text-on-surface-variant border-outline-variant/30 hover:bg-surface-variant/50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {selectedChapter && (
                <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-md">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{selectedChapter.name}</h3>
                  {loadingChapterMaterials ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
                  ) : selectedChapter.parts.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">No parts yet in this chapter.</p>
                  ) : (
                    selectedChapter.parts
                      .slice()
                      .sort((a, b) => a.part_number - b.part_number)
                      .map((part) => (
                        <div key={part.id}>
                          <h4 className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold mb-1">
                            {part.title}
                          </h4>
                          <div className="flex flex-col gap-1">
                            {(materialsByPart.get(part.id) || []).length === 0 ? (
                              <p className="font-body-sm text-body-sm text-on-surface-variant/70 pl-2">No materials in this part yet.</p>
                            ) : (
                              materialsByPart.get(part.id).map(renderMaterialRow)
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <VideoPlayerModal material={playingMaterial} onClose={() => setPlayingMaterial(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
