import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import { smartClassStore } from '../../lib/smartClassStore';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [favorites, setFavorites] = useState([]);
  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    setFavorites(smartClassStore.getFavorites());
  }, []);

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
        breadcrumbs={[{ label: 'Favorites' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
              Pinned & Favorite Teaching Materials
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Your starred teaching resources for quick access during classroom lectures.
            </p>
          </div>

          {favorites.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-amber-400/60 mb-2">
                star
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No favorite materials yet
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Click the star icon on any resource card in the library or chapter workspace to save it here.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/library')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Search Library
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((mat) => (
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
          allMaterialsInTopic={favorites}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
