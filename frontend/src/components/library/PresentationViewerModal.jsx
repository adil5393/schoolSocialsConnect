import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/smartClassAuth';

export default function PresentationViewerModal({
  material,
  onClose,
  initialSlideIndex = 0,
  onMaterialUpdated,
}) {
  const [currentSlide, setCurrentSlide] = useState(initialSlideIndex);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showGridView, setShowGridView] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [chalkboardMode, setChalkboardMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isRetrying, setIsRetrying] = useState(false);
  const [localMaterial, setLocalMaterial] = useState(material);

  const containerRef = useRef(null);
  const thumbListRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Sync local material when prop changes
  useEffect(() => {
    setLocalMaterial(material);
  }, [material]);

  const slideUrls = localMaterial?.slide_urls || [];
  const slideThumbs = localMaterial?.slide_thumbnail_urls || [];
  const totalSlides = slideUrls.length || localMaterial?.slide_count || 0;
  const isProcessing = localMaterial?.status === 'pending' || localMaterial?.status === 'processing';
  const isFailed = localMaterial?.status === 'failed';

  // Fetch full slide deck URLs if not already present on mount
  useEffect(() => {
    if (!material?.id) return;
    let isCancelled = false;
    if (!material.slide_urls || material.slide_urls.length === 0) {
      apiFetch(`/library/materials/${material.id}/presentation`)
        .then((fullData) => {
          if (!isCancelled && fullData) {
            setLocalMaterial(fullData);
          }
        })
        .catch((err) => {
          console.error('Failed to load presentation deck:', err);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [material?.id]);

  // Auto-poll if processing (and stop cleanly once ready or failed)
  useEffect(() => {
    if (!isProcessing || !localMaterial?.id) return;

    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        const updated = await apiFetch(`/library/materials/${localMaterial.id}/presentation`);
        if (isCancelled) return;
        setLocalMaterial(updated);
        if (updated.status !== 'pending' && updated.status !== 'processing') {
          if (onMaterialUpdated) onMaterialUpdated(updated);
        }
      } catch (err) {
        console.error('Failed to poll presentation status:', err);
      }
    }, 2500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isProcessing, localMaterial?.id, onMaterialUpdated]);

  // Preload neighboring slides for seamless presentation flow
  useEffect(() => {
    if (slideUrls.length === 0) return;
    const preloadIndices = [
      currentSlide - 1,
      currentSlide + 1,
      currentSlide + 2,
      currentSlide - 2,
    ].filter((idx) => idx >= 0 && idx < slideUrls.length);

    preloadIndices.forEach((idx) => {
      const img = new Image();
      img.src = slideUrls[idx];
    });
  }, [currentSlide, slideUrls]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (showThumbnails && thumbListRef.current) {
      const activeEl = thumbListRef.current.children[currentSlide];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSlide, showThumbnails]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev > 0) {
        setZoomLevel(1);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < totalSlides - 1) {
        setZoomLevel(1);
        return prev + 1;
      }
      return prev;
    });
  }, [totalSlides]);

  const handleJumpToSlide = useCallback((index) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      setZoomLevel(1);
      setShowGridView(false);
    }
  }, [totalSlides]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsPresentMode(true);
      } else {
        await document.exitFullscreen();
        setIsPresentMode(false);
      }
    } catch {
      setIsPresentMode((v) => !v);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrev();
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'PageDown' ||
        e.key === ' ' ||
        e.key === 'n' ||
        e.key === 'N' ||
        e.key === 'Enter'
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleJumpToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleJumpToSlide(totalSlides - 1);
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGridView((v) => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLaserActive((v) => !v);
      } else if (e.key === 'Escape') {
        if (showGridView) {
          e.preventDefault();
          setShowGridView(false);
        } else if (isPresentMode) {
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsPresentMode(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, handleJumpToSlide, isPresentMode, onClose, showGridView, toggleFullscreen, totalSlides]);

  // Touch swipe support for mobile/tablets
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseMove = (e) => {
    if (laserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleRetry = async () => {
    if (!localMaterial?.id) return;
    setIsRetrying(true);
    try {
      const res = await apiFetch(`/library/materials/${localMaterial.id}/retry-processing`, {
        method: 'POST',
      });
      setLocalMaterial(res);
      if (onMaterialUpdated) onMaterialUpdated(res);
    } catch (err) {
      console.error('Failed to retry processing:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const downloadUrl = localMaterial?.original_file_url || localMaterial?.file_url;

  if (!localMaterial) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-[80] flex flex-col select-none ${
        chalkboardMode
          ? 'bg-[#0a0f0d] text-emerald-100'
          : isPresentMode
          ? 'bg-black text-white'
          : 'bg-[#0b0c14] text-on-surface'
      }`}
    >
      {/* Laser Pointer Spotlight */}
      {laserActive && (
        <div
          className="fixed pointer-events-none z-[100] w-6 h-6 rounded-full bg-red-500 shadow-[0_0_24px_8px_rgba(239,68,68,0.95)] transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 animate-pulse"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Top Navigation Bar (Hidden in clean Present Mode or minimized) */}
      {!isPresentMode ? (
        <header className="h-14 px-4 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/15 flex items-center justify-between shrink-0 z-20">
          {/* Left: Back & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-on-surface font-semibold text-xs transition-colors cursor-pointer border border-outline-variant/20 shrink-0"
              title="Return to Chapter Workspace (Esc)"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Back to Topic</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant truncate">
              <span className="font-bold text-secondary">Class {localMaterial.class_name}</span>
              <span>•</span>
              <span className="truncate">{localMaterial.subject_name}</span>
              <span>•</span>
              <span className="truncate text-on-surface font-medium">{localMaterial.chapter_name}</span>
              <span>•</span>
              <span className="truncate text-secondary hidden md:inline">{localMaterial.part_title}</span>
            </div>
          </div>

          {/* Center: Title */}
          <div className="text-center px-4 max-w-sm truncate hidden lg:block">
            <span className="font-headline-sm text-sm font-bold text-on-surface truncate flex items-center gap-2 justify-center">
              <span className="material-symbols-outlined text-orange-400 text-[18px]">slideshow</span>
              <span className="truncate">{localMaterial.title}</span>
            </span>
          </div>

          {/* Right: Presentation Tools & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Download Original PPT */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-variant/30 hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors cursor-pointer border border-outline-variant/20"
                title="Download original PPT/PPTX file"
              >
                <span className="material-symbols-outlined text-[16px] text-orange-400">download</span>
                <span className="hidden md:inline">Download PPT</span>
              </a>
            )}

            {/* Grid Overview Toggle */}
            {totalSlides > 0 && (
              <button
                type="button"
                onClick={() => setShowGridView((v) => !v)}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  showGridView
                    ? 'bg-secondary text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                }`}
                title="View All Slides Grid (Key: G)"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span className="hidden sm:inline">Grid</span>
              </button>
            )}

            {/* Laser Pointer */}
            <button
              type="button"
              onClick={() => setLaserActive((v) => !v)}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                laserActive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
              title="Laser Pointer Spotlight (Key: L)"
            >
              <span className="material-symbols-outlined text-[18px]">highlight</span>
            </button>

            {/* Chalkboard Mode */}
            <button
              type="button"
              onClick={() => setChalkboardMode((v) => !v)}
              className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                chalkboardMode
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40'
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
              title="Classroom Chalkboard Theme"
            >
              <span className="material-symbols-outlined text-[18px]">brush</span>
            </button>

            {/* Fullscreen Present Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm"
              title="Launch Fullscreen Presenter Mode (Key: F)"
            >
              <span className="material-symbols-outlined text-[18px]">present_to_all</span>
              <span className="hidden sm:inline">Present</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors cursor-pointer ml-1"
              title="Close Viewer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </header>
      ) : (
        /* Minimal overlay bar in Present Mode (Hover to reveal) */
        <div className="absolute top-3 right-4 z-50 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
          <span className="text-xs font-bold text-white px-2">
            Slide {currentSlide + 1} of {totalSlides}
          </span>
          <button
            type="button"
            onClick={() => setLaserActive((v) => !v)}
            className={`p-1.5 rounded-lg cursor-pointer ${laserActive ? 'bg-red-500 text-white' : 'text-white/80 hover:bg-white/10'}`}
            title="Laser Pointer (Key: L)"
          >
            <span className="material-symbols-outlined text-[18px]">highlight</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 cursor-pointer"
            title="Exit Fullscreen (Esc or F)"
          >
            <span className="material-symbols-outlined text-[18px]">fullscreen_exit</span>
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Left Thumbnail Sidebar */}
        {!isPresentMode && showThumbnails && totalSlides > 0 && (
          <aside className="w-52 md:w-60 bg-surface-container-lowest/80 backdrop-blur-md border-r border-outline-variant/15 flex flex-col shrink-0 z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-outline-variant/15 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Slides ({totalSlides})
              </span>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 cursor-pointer"
                title="Hide slide thumbnails"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
              </button>
            </div>

            <div ref={thumbListRef} className="flex-1 overflow-y-auto p-2 space-y-2.5 no-scrollbar">
              {slideUrls.map((url, idx) => {
                const isActive = idx === currentSlide;
                const thumbUrl = slideThumbs[idx] || url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToSlide(idx)}
                    className={`w-full text-left rounded-xl p-1.5 border transition-all cursor-pointer relative group flex flex-col ${
                      isActive
                        ? 'bg-secondary/15 border-secondary shadow-md ring-2 ring-secondary/40'
                        : 'bg-surface-container-low border-outline-variant/15 hover:border-outline-variant/40 hover:bg-surface-container'
                    }`}
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/60 flex items-center justify-center">
                      <img
                        src={thumbUrl}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Collapsed Sidebar Restore Button */}
        {!isPresentMode && !showThumbnails && totalSlides > 0 && (
          <button
            type="button"
            onClick={() => setShowThumbnails(true)}
            className="absolute left-3 top-3 z-30 p-2 rounded-xl bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/30 text-on-surface hover:text-secondary shadow-lg cursor-pointer"
            title="Show slide thumbnails"
          >
            <span className="material-symbols-outlined text-[20px]">view_sidebar</span>
          </button>
        )}

        {/* Slide Stage Canvas */}
        <main
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 relative flex items-center justify-center overflow-hidden p-2 md:p-6"
        >
          {/* Processing State Banner */}
          {isProcessing && (
            <div className="text-center p-8 bg-surface-container-low rounded-2xl border border-secondary/30 shadow-2xl max-w-lg animate-in fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px] text-secondary animate-spin">
                  progress_activity
                </span>
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Converting Presentation...
              </h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                We are generating high-resolution slide images so you can present smoothly without downloading PowerPoint. This usually takes 10–30 seconds.
              </p>
              {downloadUrl && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={downloadUrl}
                    download
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-variant hover:bg-surface-variant/80 text-on-surface font-semibold rounded-xl text-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download Original PPT</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Failed State Screen */}
          {isFailed && (
            <div className="text-center p-8 bg-surface-container-low rounded-2xl border border-error/30 shadow-2xl max-w-lg animate-in fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[36px]">error</span>
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Slide Preview Not Ready
              </h3>
              <p className="text-sm text-on-surface-variant mb-6">
                {localMaterial.error_message || 'Automatic slide extraction could not be completed.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary-container font-bold rounded-xl text-xs hover:opacity-90 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isRetrying ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>{isRetrying ? 'Retrying...' : 'Retry Slide Generation'}</span>
                </button>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-variant hover:bg-surface-variant/80 text-on-surface font-semibold rounded-xl text-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download PPTX File</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* High-Resolution Slide Display */}
          {!isProcessing && !isFailed && totalSlides > 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <div
                className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  key={currentSlide}
                  src={slideUrls[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl border border-white/10 select-none animate-in fade-in duration-150"
                />
              </div>

              {/* Large Overlay Navigation Arrows */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className={`absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface-container-high/70 hover:bg-surface-container-high text-on-surface border border-outline-variant/30 backdrop-blur-md shadow-xl transition-all cursor-pointer ${
                  currentSlide === 0 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100 hover:scale-110'
                }`}
                title="Previous Slide (← / PageUp)"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentSlide === totalSlides - 1}
                className={`absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface-container-high/70 hover:bg-surface-container-high text-on-surface border border-outline-variant/30 backdrop-blur-md shadow-xl transition-all cursor-pointer ${
                  currentSlide === totalSlides - 1 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100 hover:scale-110'
                }`}
                title="Next Slide (→ / Space / PageDown)"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* Fallback for documents with no extracted slides but direct PDF or file URL */}
          {!isProcessing && !isFailed && totalSlides === 0 && (
            <div className="w-full h-full max-w-5xl max-h-[85vh] bg-surface-container-low rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col">
              {localMaterial.preview_pdf_url || localMaterial.file_url ? (
                <iframe
                  src={`${localMaterial.preview_pdf_url || localMaterial.file_url}#toolbar=1`}
                  title={localMaterial.title}
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <span className="material-symbols-outlined text-[48px] text-orange-400 mb-3">slideshow</span>
                  <h3 className="font-headline-sm text-lg font-bold mb-2">{localMaterial.title}</h3>
                  <p className="text-sm text-on-surface-variant max-w-sm mb-6">
                    Presentation ready for classroom use.
                  </p>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download
                      className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary-container font-bold rounded-xl text-sm hover:opacity-90 shadow-lg"
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                      <span>Download Presentation</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom Presentation Control Bar */}
      {!isProcessing && !isFailed && totalSlides > 0 && (
        <footer className="h-16 px-4 md:px-8 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/15 flex items-center justify-between shrink-0 z-20">
          {/* Left: Previous Slide Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer border ${
              currentSlide > 0
                ? 'bg-surface-container-high hover:bg-surface-variant text-on-surface border-outline-variant/30 hover:border-secondary/40 shadow-sm'
                : 'opacity-40 cursor-not-allowed border-transparent text-on-surface-variant/50'
            }`}
            title="Previous Slide (← / PageUp)"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Center: Slide Position, Counter & Direct Jump */}
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm font-bold text-on-surface tracking-wide">
              Slide <span className="text-secondary">{currentSlide + 1}</span> of {totalSlides}
            </span>

            {/* Slider for quick scrubbing */}
            <input
              type="range"
              min="0"
              max={Math.max(0, totalSlides - 1)}
              value={currentSlide}
              onChange={(e) => handleJumpToSlide(Number(e.target.value))}
              className="w-24 sm:w-44 accent-secondary cursor-pointer h-1.5 bg-surface-variant rounded-lg"
              title="Scrub slides"
            />

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-lg border border-outline-variant/20 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="p-1 hover:text-secondary cursor-pointer"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[16px]">zoom_out</span>
              </button>
              <span className="font-mono text-[11px] px-1">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="p-1 hover:text-secondary cursor-pointer"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[16px]">zoom_in</span>
              </button>
              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="text-[10px] text-secondary hover:underline ml-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Right: Next Slide Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlide === totalSlides - 1}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer border ${
              currentSlide < totalSlides - 1
                ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container hover:opacity-90 shadow-md'
                : 'opacity-40 cursor-not-allowed border-transparent text-on-surface-variant/50'
            }`}
            title="Next Slide (→ / Space / PageDown)"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </footer>
      )}

      {/* Grid Overview Modal Overlay (Press G) */}
      {showGridView && totalSlides > 0 && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-xl p-4 md:p-8 flex flex-col animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-6">
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">grid_view</span>
                <span>All Slides ({totalSlides})</span>
              </h3>
              <p className="text-xs text-on-surface-variant">Click any slide to jump directly to it</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGridView(false)}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface cursor-pointer border border-outline-variant/20"
              title="Close Grid (Esc / G)"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {slideUrls.map((url, idx) => {
              const isActive = idx === currentSlide;
              const thumbUrl = slideThumbs[idx] || url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToSlide(idx)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all p-1 text-left cursor-pointer group flex flex-col ${
                    isActive
                      ? 'border-secondary ring-4 ring-secondary/30 bg-secondary/10 scale-102 shadow-xl'
                      : 'border-outline-variant/20 hover:border-secondary/60 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                    <img
                      src={thumbUrl}
                      alt={`Slide ${idx + 1}`}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between px-1">
                    <span className={`text-xs font-bold ${isActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      Slide {idx + 1}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/20 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
