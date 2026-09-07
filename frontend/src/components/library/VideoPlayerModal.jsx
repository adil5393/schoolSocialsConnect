import React from 'react';

export default function VideoPlayerModal({ material, onClose }) {
  if (!material) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-surface rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between p-md border-b border-outline-variant/10">
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">{material.title}</h3>
            <p className="font-label-md text-label-md text-on-surface-variant truncate">
              Class {material.class_name} → {material.subject_name} → {material.chapter_name} → {material.part_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-variant p-2 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="bg-black aspect-video">
          {material.video_url ? (
            <video src={material.video_url} controls autoPlay className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">Video not available</div>
          )}
        </div>
      </div>
    </div>
  );
}
