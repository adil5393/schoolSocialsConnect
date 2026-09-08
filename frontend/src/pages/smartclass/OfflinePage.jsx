import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import ResourceCard from '../../components/library/ResourceCard';
import TeachPresentMode from '../../components/library/TeachPresentMode';
import VideoPlayerModal from '../../components/library/VideoPlayerModal';
import ImageViewerModal from '../../components/library/ImageViewerModal';
import { smartClassStore } from '../../lib/smartClassStore';

export default function OfflinePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [offlineItems, setOfflineItems] = useState([]);
  const [presentingMaterial, setPresentingMaterial] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    setOfflineItems(smartClassStore.getOfflineItems());
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
        breadcrumbs={[{ label: 'Downloads / Offline' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <span className="material-symbols-outlined text-[14px]">offline_pin</span>
                <span>Classroom Offline Cache</span>
              </div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
                Offline Teaching Resources
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Cached resources available for presenting in smart classrooms without internet interruptions.
              </p>
            </div>
          </div>

          {offlineItems.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30 p-8 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-emerald-400/60 mb-2">
                download_for_offline
              </span>
              <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                No offline cached resources
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mb-4">
                Click the "Save for Offline" option on any material card to ensure high-speed presentations in class.
              </p>
              <button
                type="button"
                onClick={() => navigate('/smart-class/library')}
                className="px-5 py-2.5 bg-secondary text-on-secondary-container rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Explore Library
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {offlineItems.map((mat) => (
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
          allMaterialsInTopic={offlineItems}
          onClose={() => setPresentingMaterial(null)}
          onSelectMaterial={setPresentingMaterial}
        />
      )}

      <VideoPlayerModal material={playingVideo} onClose={() => setPlayingVideo(null)} />
      <ImageViewerModal material={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
