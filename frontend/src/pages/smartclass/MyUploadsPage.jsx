import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import { apiFetch, ApiError, useAuth } from '../../lib/smartClassAuth';

export default function MyUploadsPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;
  const { user } = useAuth();

  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  const loadUploads = async () => {
    setLoading(true);
    try {
      // Load materials uploaded by current user
      const data = await apiFetch(`/library/materials?teacher_id=${user?.id || ''}`);
      setUploads(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUploads();
  }, [user?.id]);

  const handleDelete = async (mat) => {
    if (!window.confirm(`Delete "${mat.title}"?`)) return;
    try {
      await apiFetch(`/library/materials/${mat.id}`, { method: 'DELETE' });
      setUploads((prev) => prev.filter((m) => m.id !== mat.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
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
        breadcrumbs={[{ label: 'My Uploads' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                My Uploaded Materials
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Manage and review the teaching videos, notes, and worksheets you have contributed to the school library.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/smart-class/add-material')}
              className="px-5 py-2.5 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload New Material</span>
            </button>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span>Loading your uploads...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-2">
                upload_file
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                You haven't uploaded any materials yet
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Upload your video lessons, slides, diagrams, and question sets to share them with classes.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/add-material')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Upload First Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((mat) => (
                <ResourceCard
                  key={mat.id}
                  material={mat}
                  showCurriculumContext
                  onOpen={handleOpen}
                  onPresent={handlePresent}
                  onDelete={handleDelete}
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
          allMaterialsInTopic={uploads}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
