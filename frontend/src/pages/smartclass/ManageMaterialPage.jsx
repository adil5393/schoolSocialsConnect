import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import PresentationViewerModal from '../../components/library/PresentationViewerModal';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

export default function ManageMaterialPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [presentingPresentation, setPresentingPresentation] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/library/materials');
      setMaterials(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleDelete = async (mat) => {
    if (!window.confirm(`Are you sure you want to delete "${mat.title}"?`)) return;
    try {
      await apiFetch(`/library/materials/${mat.id}`, { method: 'DELETE' });
      setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete material');
    }
  };

  const handleRetry = async (mat) => {
    try {
      const updated = await apiFetch(`/library/materials/${mat.id}/retry-processing`, { method: 'POST' });
      setMaterials((prev) => prev.map((m) => (m.id === mat.id ? updated : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to retry');
    }
  };

  const handleStartEdit = (mat) => {
    setEditingMaterial(mat);
    setEditTitle(mat.title);
    setEditCategory(mat.category || 'learn');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await apiFetch(`/library/materials/${editingMaterial.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle.trim(),
          category: editCategory,
        },
      });
      setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMaterial(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update material');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpen = (mat) => {
    const isPres =
      (mat.resource_type || '').toLowerCase() === 'presentation' ||
      (mat.media_type || '').toLowerCase() === 'document' ||
      (mat.slide_count && mat.slide_count > 0) ||
      (mat.slide_urls && mat.slide_urls.length > 0) ||
      (mat.title && mat.title.toLowerCase().match(/\.(ppt|pptx)$/));

    if (isPres) {
      setPresentingPresentation(mat);
    } else if (mat.media_type === 'video') {
      setPlayingVideo(mat);
    } else if (mat.media_type === 'image') {
      setViewingImage(mat);
    } else if (mat.file_url) {
      window.open(mat.file_url, '_blank');
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.chapter_name.toLowerCase().includes(search.toLowerCase()) ||
    m.part_title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Manage Materials' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                Manage Teaching Materials
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Edit metadata, reassign categories, or delete outdated resources across the library.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/smart-class/add-material')}
              className="px-5 py-2.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add New Material</span>
            </button>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Search Filter Bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter materials by title, chapter, or topic..."
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary"
            />
          </div>

          {/* Materials List */}
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Loading materials...</span>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                inventory_2
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No materials match your filter
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => (
                <ResourceCard
                  key={mat.id}
                  material={mat}
                  showCurriculumContext
                  onOpen={() => handleOpen(mat)}
                  onPresent={() => setPresentingMaterial(mat)}
                  onEdit={handleStartEdit}
                  onDelete={handleDelete}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface-container rounded-2xl p-6 border border-outline-variant/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Edit Material</h3>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Learning Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-surface-dim border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="learn">Learn (Explanations & Concepts)</option>
                  <option value="understand">Understand (Worked Examples)</option>
                  <option value="practice">Practice (Worksheets & Tests)</option>
                  <option value="reference">Reference (PDF Notes & Diagrams)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 rounded-xl text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editTitle.trim()}
                  className="px-5 py-2 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Present Mode & Viewer Modals */}
      {presentingMaterial && (
        <TeachPresentMode
          material={presentingMaterial}
          allMaterialsInTopic={filteredMaterials}
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

      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
