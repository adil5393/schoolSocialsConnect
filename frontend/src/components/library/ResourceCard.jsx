import React, { useState } from 'react';
import { smartClassStore } from '../../lib/smartClassStore';

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const RESOURCE_TYPE_CONFIG = {
  presentation: { label: 'Presentation', icon: 'slideshow', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  video: { label: 'Video', icon: 'play_circle', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  pdf: { label: 'PDF Document', icon: 'picture_as_pdf', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  image: { label: 'Diagram / Image', icon: 'image', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  document: { label: 'Presentation / Doc', icon: 'slideshow', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  audio: { label: 'Audio Clip', icon: 'volume_up', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  link: { label: 'Web Link', icon: 'link', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  interactive: { label: 'Interactive Simulation', icon: 'touch_app', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  worksheet: { label: 'Worksheet', icon: 'assignment', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  question_set: { label: 'Question Set', icon: 'quiz', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  teacher_explanation: { label: 'Teacher Explanation', icon: 'record_voice_over', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
  book_extract: { label: 'Book Extract', icon: 'menu_book', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
};

export default function ResourceCard({
  material,
  onOpen,
  onPresent,
  onEdit,
  onDelete,
  onRetry,
  showCurriculumContext = false,
  compact = false,
}) {
  const [isFav, setIsFav] = useState(() => smartClassStore.isFavorite(material.id));
  const [isSavedOffline, setIsSavedOffline] = useState(() => smartClassStore.isOffline(material.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const resType = (material.resource_type || material.media_type || 'video').toLowerCase();
  const isPresentation =
    resType === 'presentation' ||
    resType === 'document' ||
    (material.slide_count && material.slide_count > 0) ||
    (material.slide_urls && material.slide_urls.length > 0) ||
    (material.title && material.title.toLowerCase().match(/\.(ppt|pptx)$/));

  const isProcessing = material.status === 'pending' || material.status === 'processing';
  const isFailed = material.status === 'failed';

  const config = isPresentation
    ? RESOURCE_TYPE_CONFIG.presentation
    : RESOURCE_TYPE_CONFIG[resType] || {
        label: material.media_type || 'Resource',
        icon: 'description',
        color: 'text-secondary',
        bg: 'bg-secondary/10 border-secondary/30',
      };

  const handleToggleFav = (e) => {
    e.stopPropagation();
    const updated = smartClassStore.toggleFavorite(material);
    setIsFav(updated);
  };

  const handleToggleOffline = (e) => {
    e.stopPropagation();
    const updated = smartClassStore.toggleOffline(material);
    setIsSavedOffline(updated);
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const link = material.original_file_url || material.file_url;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Thumbnail image priority: presentation slide thumb -> thumbnail_url -> image file_url
  const previewImage =
    (material.slide_thumbnail_urls && material.slide_thumbnail_urls[0]) ||
    (material.slide_urls && material.slide_urls[0]) ||
    material.thumbnail_url ||
    (material.media_type === 'image' ? material.file_url : null);

  return (
    <div
      className={`group relative bg-surface-container-low hover:bg-surface-container transition-all duration-200 rounded-xl border border-outline-variant/20 hover:border-secondary/40 shadow-sm flex flex-col justify-between ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div>
        {/* Top bar: Curriculum breadcrumb if enabled */}
        {showCurriculumContext && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/80 mb-2 truncate">
            <span className="font-semibold text-secondary">Class {material.class_name}</span>
            <span>•</span>
            <span className="truncate">{material.subject_name}</span>
            <span>•</span>
            <span className="truncate text-on-surface/90">{material.chapter_name}</span>
          </div>
        )}

        {/* Header: Type Badge & Action Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${config.bg} ${config.color}`}>
            <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
            <span>{config.label}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Offline status badge */}
            {isSavedOffline && (
              <span className="material-symbols-outlined text-[16px] text-emerald-400" title="Saved for Offline Presentation">
                download_done
              </span>
            )}

            {/* Favorite button */}
            <button
              type="button"
              onClick={handleToggleFav}
              className={`p-1 rounded-full hover:bg-surface-variant/50 transition-colors cursor-pointer ${
                isFav ? 'text-amber-400' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className="material-symbols-outlined text-[18px]" style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                star
              </span>
            </button>

            {/* Context Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors cursor-pointer"
                title="More options"
              >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-7 z-40 w-48 bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-xl p-1.5 text-xs animate-in fade-in">
                    <button
                      type="button"
                      onClick={handleToggleOffline}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-surface-variant flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSavedOffline ? 'remove_circle_outline' : 'download_for_offline'}
                      </span>
                      {isSavedOffline ? 'Remove Offline' : 'Save for Offline'}
                    </button>

                    {(material.original_file_url || material.file_url) && (
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-surface-variant flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copied ? 'check' : 'link'}
                        </span>
                        {copied ? 'Link Copied!' : 'Copy Direct Link'}
                      </button>
                    )}

                    {(material.original_file_url || material.file_url) && (
                      <a
                        href={material.original_file_url || material.file_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-surface-variant flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Download File
                      </a>
                    )}

                    {onRetry && isFailed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onRetry(material);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-secondary hover:bg-surface-variant flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Retry Slide Conversion
                      </button>
                    )}

                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onEdit(material);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-surface-variant flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit Material
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onDelete(material);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-error hover:bg-error-container/20 flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Delete Material
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail / Preview Area */}
        <div
          onClick={() => onOpen && onOpen(material)}
          className="relative w-full h-32 rounded-lg bg-surface-dim overflow-hidden border border-outline-variant/15 flex items-center justify-center cursor-pointer mb-3 group-hover:border-secondary/40 transition-colors"
        >
          {previewImage ? (
            <img
              src={previewImage}
              alt={material.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px] opacity-70">{config.icon}</span>
              <span className="text-[11px] font-medium tracking-wide uppercase opacity-60">{config.label}</span>
            </div>
          )}

          {/* Quick Play/View Overlay */}
          <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-colors flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-secondary-container/90 text-on-secondary-container flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all shadow-lg">
              <span className="material-symbols-outlined text-[24px]">
                {isPresentation ? 'slideshow' : material.media_type === 'video' ? 'play_arrow' : material.media_type === 'image' ? 'visibility' : 'open_in_new'}
              </span>
            </div>
          </div>

          {/* Slide Count Badge for Presentations */}
          {isPresentation && material.slide_count != null && material.slide_count > 0 && (
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[11px] font-bold text-orange-400 border border-orange-500/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">slideshow</span>
              <span>{material.slide_count} Slides</span>
            </div>
          )}

          {/* Duration Badge for Videos */}
          {material.duration_seconds != null && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm text-[11px] font-semibold text-on-surface border border-outline-variant/30">
              {formatDuration(material.duration_seconds)}
            </div>
          )}

          {/* Processing Status Badge */}
          {isProcessing && (
            <div className="absolute inset-x-0 bottom-0 bg-secondary-container/90 backdrop-blur-xs text-on-secondary-container py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
              <span>Processing Presentation Slides...</span>
            </div>
          )}

          {/* Failed Status Badge */}
          {isFailed && (
            <div className="absolute inset-x-0 bottom-0 bg-error-container/90 backdrop-blur-xs text-on-error-container py-1 px-2 text-[10px] font-bold flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[12px]">error</span>
              <span>Slide Preview Failed</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h4
          onClick={() => onOpen && onOpen(material)}
          className="font-headline-sm text-sm md:text-base font-bold text-on-surface hover:text-secondary line-clamp-2 cursor-pointer transition-colors leading-snug mb-1"
          title={material.title}
        >
          {material.title}
        </h4>

        {/* Description / Subtext if present */}
        {material.description && (
          <p className="text-xs text-on-surface-variant/80 line-clamp-1 mb-2 font-normal">
            {material.description}
          </p>
        )}

        {/* Metadata Footer */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-variant/70 mb-3">
          {material.source && (
            <span className="flex items-center gap-1 font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-[13px]">source</span>
              <span className="truncate max-w-[120px]">{material.source}</span>
            </span>
          )}

          {material.created_by_name && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">person</span>
              <span className="truncate max-w-[100px]">{material.created_by_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: OPEN & PRESENT */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/10">
        <button
          type="button"
          onClick={() => onOpen && onOpen(material)}
          className={`w-full py-1.5 px-3 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
            isPresentation
              ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/30'
              : 'bg-surface-container-high hover:bg-surface-variant text-on-surface border-outline-variant/20'
          }`}
          title={isPresentation ? 'Open in In-App Presentation Viewer' : 'Open Resource'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPresentation ? 'slideshow' : 'visibility'}
          </span>
          <span>{isPresentation ? 'Presentation' : 'Open'}</span>
        </button>

        <button
          type="button"
          onClick={() => onPresent && onPresent(material)}
          className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-secondary-container to-secondary hover:opacity-90 text-on-secondary-container font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          title="Launch Fullscreen Distraction-Free Classroom Presentation"
        >
          <span className="material-symbols-outlined text-[16px]">cast_for_education</span>
          <span>Present</span>
        </button>
      </div>
    </div>
  );
}
