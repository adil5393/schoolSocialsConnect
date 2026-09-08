import React, { useEffect, useRef, useState } from 'react';
import { RESOURCE_TYPE_CONFIG } from './ResourceCard';

export default function TeachPresentMode({
  material,
  allMaterialsInTopic = [],
  onClose,
  onSelectMaterial,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [showDrawer, setShowDrawer] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [chalkboardMode, setChalkboardMode] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1);

  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Find currentIndex in allMaterialsInTopic
  const currentIndex = allMaterialsInTopic.findIndex((m) => m.id === material?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allMaterialsInTopic.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectMaterial) {
      onSelectMaterial(allMaterialsInTopic[currentIndex - 1]);
      setZoomLevel(1);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectMaterial) {
      onSelectMaterial(allMaterialsInTopic[currentIndex + 1]);
      setZoomLevel(1);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // fallback
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'l' || e.key === 'L') {
        setLaserActive((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allMaterialsInTopic, onClose]);

  // Track fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Laser pointer mouse follower
  const handleMouseMove = (e) => {
    if (laserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  const resType = (material?.resource_type || material?.media_type || 'video').toLowerCase();
  const config = RESOURCE_TYPE_CONFIG[resType] || { label: 'Resource', icon: 'description' };

  if (!material) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex flex-col select-none ${
        chalkboardMode ? 'bg-[#0a0f0d] text-emerald-100' : 'bg-[#0d0d15] text-on-surface'
      }`}
    >
      {/* Laser Pointer Dot */}
      {laserActive && (
        <div
          className="fixed pointer-events-none z-50 w-6 h-6 rounded-full bg-red-500 shadow-[0_0_20px_6px_rgba(239,68,68,0.9)] transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 animate-pulse"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Top Presentation Bar: Minimal Distraction-Free Header */}
      <header className="h-14 px-4 md:px-6 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/15 flex items-center justify-between shrink-0 z-40">
        {/* Left: Back to Topic & Curriculum context */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-on-surface font-semibold text-xs md:text-sm transition-colors cursor-pointer border border-outline-variant/20"
            title="Exit Present Mode (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Topic</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant truncate">
            <span className="font-bold text-secondary">Class {material.class_name}</span>
            <span>•</span>
            <span>{material.subject_name}</span>
            <span>•</span>
            <span className="text-on-surface font-medium truncate max-w-[200px]">{material.chapter_name}</span>
            <span>•</span>
            <span className="text-secondary truncate max-w-[180px]">{material.part_title}</span>
          </div>
        </div>

        {/* Center: Title & Type */}
        <div className="text-center px-4 max-w-md truncate hidden md:block">
          <p className="font-headline-sm text-sm font-bold text-on-surface truncate">{material.title}</p>
        </div>

        {/* Right: Presentation Tools */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Laser Pointer Toggle */}
          <button
            type="button"
            onClick={() => setLaserActive((v) => !v)}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              laserActive
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant/40'
            }`}
            title="Laser Pointer Mode (Key: L)"
          >
            <span className="material-symbols-outlined text-[18px]">highlight</span>
            <span className="hidden lg:inline">{laserActive ? 'Laser On' : 'Laser'}</span>
          </button>

          {/* Chalkboard Theme Toggle */}
          <button
            type="button"
            onClick={() => setChalkboardMode((v) => !v)}
            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
              chalkboardMode ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/40' : 'text-on-surface-variant hover:bg-surface-variant/40'
            }`}
            title="Toggle High-Contrast Classroom Chalkboard"
          >
            <span className="material-symbols-outlined text-[18px]">brush</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 transition-colors cursor-pointer"
            title="Toggle Fullscreen (Key: F)"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          {/* Resource Drawer Toggle */}
          {allMaterialsInTopic.length > 1 && (
            <button
              type="button"
              onClick={() => setShowDrawer((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                showDrawer
                  ? 'bg-secondary text-on-secondary-container border-secondary'
                  : 'bg-surface-variant/40 hover:bg-surface-variant text-on-surface border-outline-variant/20'
              }`}
              title="Show all resources in this topic"
            >
              <span className="material-symbols-outlined text-[18px]">playlist_play</span>
              <span className="hidden sm:inline">Topic Resources ({allMaterialsInTopic.length})</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden p-2 md:p-4">
        {/* Content Viewer based on Resource Type */}
        {material.media_type === 'video' ? (
          <div className="w-full h-full max-w-6xl max-h-[85vh] flex flex-col items-center justify-center">
            {material.file_url ? (
              <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col">
                <video
                  ref={videoRef}
                  src={material.file_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-surface-container-low rounded-2xl border border-outline-variant/20 max-w-md">
                <span className="material-symbols-outlined text-[48px] text-secondary mb-3">hourglass_top</span>
                <h3 className="font-headline-sm text-lg font-bold mb-2">Video Processing</h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  This video is currently being normalized and prepared for classroom streaming.
                </p>
                {material.source_url && (
                  <a
                    href={material.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary-container font-semibold rounded-lg text-sm hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    <span>Open on Source Site</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : material.media_type === 'image' ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-auto">
            <div
              className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={material.file_url || material.thumbnail_url}
                alt={material.title}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-outline-variant/20"
              />
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-container-high/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/30 flex items-center gap-2 shadow-xl">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1 text-on-surface hover:text-secondary cursor-pointer"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="text-xs font-bold text-on-surface px-1">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1 text-on-surface hover:text-secondary cursor-pointer"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="text-[11px] font-semibold text-secondary hover:underline px-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        ) : material.media_type === 'pdf' || resType === 'pdf' ? (
          <div className="w-full h-full max-w-6xl max-h-[85vh] bg-surface-container-low rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col">
            {material.file_url ? (
              <iframe
                src={`${material.file_url}#toolbar=1&navpanes=1`}
                title={material.title}
                className="w-full h-full border-0 bg-white"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-red-400 mb-3">picture_as_pdf</span>
                <h3 className="font-headline-sm text-lg font-bold mb-2">{material.title}</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mb-4">
                  Document ready for classroom display.
                </p>
                {material.file_url && (
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white font-semibold rounded-lg text-sm hover:bg-red-600 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    <span>Open in Dedicated Viewer</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Other documents, worksheets, external links, interactive content */
          <div className="w-full h-full max-w-5xl max-h-[85vh] bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[36px] text-secondary">{config.icon}</span>
            </div>
            <span className="text-xs uppercase font-bold tracking-wider text-secondary mb-1">{config.label}</span>
            <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-3 max-w-xl">{material.title}</h2>
            {material.description && (
              <p className="text-sm text-on-surface-variant max-w-lg mb-6 leading-relaxed">
                {material.description}
              </p>
            )}
            {material.file_url && (
              <a
                href={material.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold rounded-xl text-sm hover:opacity-95 shadow-lg transition-transform hover:scale-105"
              >
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                <span>Open Resource</span>
              </a>
            )}
          </div>
        )}

        {/* Sidebar Topic Resources Drawer */}
        {showDrawer && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface-container-high/95 backdrop-blur-xl border-l border-outline-variant/20 p-4 flex flex-col shadow-2xl z-40 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 mb-3">
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">Topic Resources</h3>
                <p className="text-xs text-on-surface-variant">{material.part_title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {allMaterialsInTopic.map((m, idx) => {
                const isActive = m.id === material.id;
                const mType = (m.resource_type || m.media_type || 'video').toLowerCase();
                const mConfig = RESOURCE_TYPE_CONFIG[mType] || { icon: 'description', color: 'text-secondary' };
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (onSelectMaterial) onSelectMaterial(m);
                      setShowDrawer(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isActive
                        ? 'bg-secondary/15 border-secondary text-secondary font-bold shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/10 text-on-surface hover:bg-surface-variant/40'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-surface-dim flex items-center justify-center shrink-0 font-bold text-xs text-on-surface-variant">
                      {idx + 1}
                    </span>
                    <span className={`material-symbols-outlined text-[18px] ${mConfig.color} shrink-0`}>
                      {mConfig.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{m.title}</p>
                      <p className="text-[10px] text-on-surface-variant/70 uppercase">{m.category || m.media_type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Classroom Controls Bar */}
      <footer className="h-16 px-4 md:px-8 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/15 flex items-center justify-between shrink-0 z-40">
        {/* Left: Previous Resource Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!hasPrev}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer border ${
            hasPrev
              ? 'bg-surface-container-high hover:bg-surface-variant text-on-surface border-outline-variant/30 hover:border-secondary/40 shadow-sm'
              : 'opacity-40 cursor-not-allowed border-transparent text-on-surface-variant/50'
          }`}
          title="Previous Resource (Left Arrow)"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back_ios</span>
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Center: Topic Position & Navigation indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {allMaterialsInTopic.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMaterial && onSelectMaterial(m)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  m.id === material.id ? 'w-8 bg-secondary' : 'w-2 bg-outline-variant/40 hover:bg-outline-variant'
                }`}
                title={`Jump to: ${m.title}`}
              />
            ))}
          </div>

          <span className="text-xs font-bold text-on-surface-variant hidden md:inline">
            {currentIndex + 1} of {allMaterialsInTopic.length || 1}
          </span>
        </div>

        {/* Right: Next Resource Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasNext}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer border ${
            hasNext
              ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container hover:opacity-90 shadow-md'
              : 'opacity-40 cursor-not-allowed border-transparent text-on-surface-variant/50'
          }`}
          title="Next Resource (Right Arrow)"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward_ios</span>
        </button>
      </footer>
    </div>
  );
}
