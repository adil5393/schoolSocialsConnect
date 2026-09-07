import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import { ApiError, apiFetch, apiFetchFile } from '../lib/apiClient';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;

const AUDIO_QUALITIES = [
  { value: 'best', label: 'Best' },
  { value: '320', label: '320 kbps' },
  { value: '256', label: '256 kbps' },
  { value: '192', label: '192 kbps' },
  { value: '128', label: '128 kbps' },
];

function isValidYouTubeUrl(value) {
  return YOUTUBE_URL_REGEX.test(value.trim());
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

function formatUploadDate(value) {
  if (!value || value.length !== 8) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function triggerBrowserDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function YouTubeDownloaderPage() {
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | fetching | ready | downloading-video | downloading-audio | error
  const [errorMessage, setErrorMessage] = useState('');
  const [info, setInfo] = useState(null);

  const [videoQuality, setVideoQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('best');

  const isBusy = status === 'fetching' || status === 'downloading-video' || status === 'downloading-audio';

  const videoHeights = info ? info.formats.filter((f) => f.type === 'video').map((f) => f.quality) : [];
  const hasVideo = videoHeights.length > 0;
  const hasAudio = info ? info.formats.some((f) => f.type === 'audio') : false;

  const handleFetchInfo = async (event) => {
    event.preventDefault();
    if (!isValidYouTubeUrl(url)) {
      setStatus('error');
      setErrorMessage("That doesn't look like a valid YouTube URL. Try a youtube.com/watch, youtu.be, or /shorts/ link.");
      return;
    }
    setStatus('fetching');
    setErrorMessage('');
    setInfo(null);
    try {
      const data = await apiFetch('/youtube/info', { method: 'POST', body: { url: url.trim() } });
      setInfo(data);
      setVideoQuality('best');
      setAudioFormat('mp3');
      setAudioQuality('best');
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Failed to fetch video information.');
    }
  };

  const handleDownload = async (mediaType) => {
    setStatus(mediaType === 'video' ? 'downloading-video' : 'downloading-audio');
    setErrorMessage('');
    try {
      const body =
        mediaType === 'video'
          ? { url: url.trim(), media_type: 'video', format: 'mp4', quality: videoQuality }
          : { url: url.trim(), media_type: 'audio', format: audioFormat, quality: audioQuality };
      const { blob, filename } = await apiFetchFile('/youtube/download', { method: 'POST', body });
      triggerBrowserDownload(blob, filename);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Download failed. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <TopAppBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg">
          <div className="mb-lg">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[32px]">download</span>
              YouTube Downloader
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              Download video or audio from a YouTube link
            </p>
          </div>

          {/* URL input */}
          <form onSubmit={handleFetchInfo} className="bg-surface-container-low rounded-xl p-md card-border flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 bg-surface-dim border border-outline-variant/30 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
            />
            <button
              type="submit"
              disabled={isBusy || !url.trim()}
              className="btn-gradient text-white font-label-md text-label-md px-6 py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {status === 'fetching' ? 'Fetching…' : 'Fetch Video'}
            </button>
          </form>

          {status === 'fetching' && (
            <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">Fetching video information…</p>
          )}
          {status === 'error' && errorMessage && (
            <div className="mt-3 bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
              {errorMessage}
            </div>
          )}

          {/* Video info card */}
          {info && (
            <div className="mt-lg bg-surface-container-low rounded-xl p-md card-border flex flex-col sm:flex-row gap-md">
              {info.thumbnail && (
                <img
                  src={info.thumbnail}
                  alt="Video thumbnail"
                  className="w-full sm:w-56 rounded-lg object-cover aspect-video border border-outline-variant/20 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface line-clamp-2">{info.title}</h3>
                {info.uploader && <p className="font-body-sm text-body-sm text-on-surface-variant">{info.uploader}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 font-label-md text-label-md text-on-surface-variant">
                  {info.duration != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span> {formatDuration(info.duration)}
                    </span>
                  )}
                  {formatUploadDate(info.upload_date) && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span> {formatUploadDate(info.upload_date)}
                    </span>
                  )}
                  {info.view_count != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">visibility</span> {info.view_count.toLocaleString()} views
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download options */}
          {info && (hasVideo || hasAudio) && (
            <div className="mt-lg grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {hasVideo && (
                <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">movie</span> Video
                  </h3>
                  <p className="font-label-md text-label-md text-on-surface-variant">Format: MP4</p>
                  <label className="font-label-md text-label-md text-on-surface-variant block mt-1">Quality</label>
                  <select
                    value={videoQuality}
                    onChange={(e) => setVideoQuality(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    <option value="best">Best available</option>
                    {videoHeights.map((h) => (
                      <option key={h} value={h}>
                        {h}p
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDownload('video')}
                    disabled={isBusy}
                    className="mt-2 bg-primary text-on-primary rounded-lg py-2.5 font-label-md text-label-md font-bold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {status === 'downloading-video' ? 'Preparing download…' : 'Download Video'}
                  </button>
                </section>
              )}

              {hasAudio && (
                <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">music_note</span> Audio
                  </h3>
                  <label className="font-label-md text-label-md text-on-surface-variant block">Format</label>
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    <option value="mp3">MP3</option>
                    <option value="m4a">M4A</option>
                  </select>
                  <label className="font-label-md text-label-md text-on-surface-variant block mt-1">Quality</label>
                  <select
                    value={audioQuality}
                    onChange={(e) => setAudioQuality(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    {AUDIO_QUALITIES.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDownload('audio')}
                    disabled={isBusy}
                    className="mt-2 bg-primary text-on-primary rounded-lg py-2.5 font-label-md text-label-md font-bold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {status === 'downloading-audio' ? 'Preparing download…' : 'Download Audio'}
                  </button>
                </section>
              )}
            </div>
          )}

          {info && (
            <p className="mt-md font-label-md text-label-md text-on-surface-variant/70 text-center">
              Only download content that you own or have permission to download. Availability may depend on the source
              video's restrictions.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
