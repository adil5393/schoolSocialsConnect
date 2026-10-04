import React from 'react';

export default function VideoPlayerModal({ material, onClose }) {
  if (!material) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-outline-variant/10 min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-headline-sm text-sm sm:text-headline-sm text-on-surface font-bold truncate" title={material.title}>
              {material.title}
            </h3>
            <p className="font-label-md text-[11px] sm:text-label-md text-on-surface-variant truncate">
              Class {material.class_name} → {material.subject_name} → {material.chapter_name} → {material.part_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-variant p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Close video"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">close</span>
          </button>
        </div>
        <div className="bg-black aspect-video flex-1 min-h-0 flex items-center justify-center">
          {material.file_url ? (
            <video src={material.file_url} controls autoPlay className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">Video not available</div>
          )}
        </div>
      </div>
    </div>
  );
}
