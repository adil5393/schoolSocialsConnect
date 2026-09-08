import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

const RESOURCE_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'video', name: 'Videos' },
  { id: 'pdf', name: 'PDF Notes' },
  { id: 'image', name: 'Diagrams' },
  { id: 'worksheet', name: 'Worksheets' },
  { id: 'question_set', name: 'Questions' },
  { id: 'document', name: 'Presentations' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'learn', name: 'Learn & Concepts' },
  { id: 'understand', name: 'Worked Examples' },
  { id: 'practice', name: 'Practice & Tests' },
  { id: 'reference', name: 'Reference & Notes' },
];

export default function LibrarySearchPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Data states
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals & Present Mode
  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

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
      } catch {
        // ignore
      }
    })();
  }, []);

  // Search execution
  const executeSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedClass !== 'all') params.set('class_id', selectedClass);
      if (selectedSubject !== 'all') params.set('subject_id', selectedSubject);
      if (selectedType !== 'all') params.set('resource_type', selectedType);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);

      const data = await apiFetch(`/library/materials?${params.toString()}`);
      setResults(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Run search on mount and whenever filters change
  useEffect(() => {
    executeSearch();
  }, [selectedClass, selectedSubject, selectedType, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedClass('all');
    setSelectedSubject('all');
    setSelectedType('all');
    setSelectedCategory('all');
  };

  const handleOpen = (material) => {
    if (material.media_type === 'video') {
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
        breadcrumbs={[{ label: 'Library Search' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                Search Teaching Library
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Find videos, worksheets, diagrams, and notes preserving their full curriculum context.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/smart-class/add-material')}
              className="px-5 py-2.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer self-start md:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Material</span>
            </button>
          </div>

          {/* Search Input & Multi-Factor Filters */}
          <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col gap-4">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chapters, topics, videos, PDFs, worksheets, formulas..."
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary font-medium"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-secondary text-on-secondary-container font-bold text-sm rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer shrink-0"
              >
                Search
              </button>
            </form>

            {/* Filter Pills / Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-outline-variant/10">
              {/* Class Filter */}
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Grade / Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  <option value="all">All Grades</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Class {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type Filter */}
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Resource Format
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Learning Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3 py-2 text-xs text-on-surface font-semibold cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter reset */}
            {(selectedClass !== 'all' || selectedSubject !== 'all' || selectedType !== 'all' || selectedCategory !== 'all' || searchQuery) && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-on-surface-variant font-medium">
                  Showing {results.length} result{results.length === 1 ? '' : 's'} matching active filters
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-secondary hover:underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Results Grid */}
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Searching teaching library...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                search_off
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No learning materials found
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Try searching with different keywords or clearing your active filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((mat) => (
                <ResourceCard
                  key={mat.id}
                  material={mat}
                  showCurriculumContext
                  onOpen={handleOpen}
                  onPresent={handlePresent}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Presentation Mode Fullscreen Modal */}
      {presentingMaterial && (
        <TeachPresentMode
          material={presentingMaterial}
          allMaterialsInTopic={results}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      {/* Standard Modals */}
      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
