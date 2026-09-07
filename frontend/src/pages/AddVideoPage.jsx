import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../components/layout/SmartClassTopBar';
import { ApiError, apiFetch } from '../lib/smartClassAuth.jsx';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;

function isValidYouTubeUrl(value) {
  return YOUTUBE_URL_REGEX.test(value.trim());
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const POLL_INTERVAL_MS = 3000;

export default function AddVideoPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState('idle'); // idle | fetching | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [info, setInfo] = useState(null);
  const [title, setTitle] = useState('');

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterName, setChapterName] = useState('');
  const [partTitle, setPartTitle] = useState('');

  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState(null); // set once saved; polled until ready
  const [duplicateNotice, setDuplicateNotice] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [classesData, subjectsData] = await Promise.all([apiFetch('/library/classes'), apiFetch('/library/subjects')]);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : 'Failed to load classes/subjects');
      }
    })();
  }, []);

  useEffect(() => {
    if (!classId || !subjectId) {
      setChapters([]);
      return;
    }
    apiFetch(`/library/classes/${classId}/subjects/${subjectId}/chapters`)
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [classId, subjectId]);

  const matchingChapter = useMemo(
    () => chapters.find((c) => c.name.toLowerCase() === chapterName.trim().toLowerCase()),
    [chapters, chapterName]
  );
  const partOptions = matchingChapter?.parts || [];

  // Poll the material's status while it's still processing in the background.
  useEffect(() => {
    if (!material || material.status === 'ready' || material.status === 'failed') return undefined;
    const interval = setInterval(async () => {
      try {
        const updated = await apiFetch(`/library/materials/${material.id}`);
        setMaterial(updated);
      } catch {
        // transient poll failure -- try again next tick
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [material]);

  const handleFetchInfo = async (event) => {
    event.preventDefault();
    if (!isValidYouTubeUrl(url)) {
      setFetchStatus('error');
      setErrorMessage("That doesn't look like a valid YouTube link.");
      return;
    }
    setFetchStatus('fetching');
    setErrorMessage('');
    setInfo(null);
    try {
      const data = await apiFetch('/library/video-info', { method: 'POST', body: { url: url.trim() } });
      setInfo(data);
      setTitle(data.title);
      setFetchStatus('ready');
    } catch (err) {
      setFetchStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Failed to fetch video information.');
    }
  };

  const canSave = fetchStatus === 'ready' && title.trim() && classId && subjectId && chapterName.trim() && partTitle.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setErrorMessage('');
    setDuplicateNotice(null);
    try {
      const data = await apiFetch('/library/materials', {
        method: 'POST',
        body: {
          url: url.trim(),
          title: title.trim(),
          class_id: Number(classId),
          subject_id: Number(subjectId),
          chapter_name: chapterName.trim(),
          part_title: partTitle.trim(),
        },
      });
      setMaterial(data.material);
      if (data.reused_existing_asset && data.other_locations.length > 0) {
        setDuplicateNotice(data.other_locations);
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Failed to save video.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setUrl('');
    setFetchStatus('idle');
    setInfo(null);
    setTitle('');
    setChapterName('');
    setPartTitle('');
    setMaterial(null);
    setDuplicateNotice(null);
    setErrorMessage('');
  };

  // --- Success screen ---
  if (material && material.status === 'ready') {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />
        <main className="flex-1 flex items-center justify-center px-margin-mobile">
          <div className="max-w-md w-full bg-surface-container-low rounded-2xl p-lg card-border text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[36px]">check_circle</span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Video added to Smart Class Library</h2>
            <div className="font-body-md text-body-md text-on-surface-variant">
              Class {material.class_name} → {material.subject_name} → {material.chapter_name} → {material.part_title}
            </div>
            {duplicateNotice && (
              <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-dim rounded-lg p-3">
                This video was already in your library at: {duplicateNotice.join(', ')}. It's now also available here without
                re-downloading.
              </p>
            )}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => navigate('/smart-class/library')}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Open Video
              </button>
              <button
                type="button"
                onClick={handleAddAnother}
                className="px-6 py-2.5 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Add Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Processing screen ---
  if (material && (material.status === 'pending' || material.status === 'processing')) {
    const steps = [
      { key: 'fetching', label: 'Fetching source' },
      { key: 'processing', label: 'Processing video' },
      { key: 'uploading', label: 'Uploading to library' },
    ];
    const currentIndex = steps.findIndex((s) => s.key === material.processing_stage);
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />
        <main className="flex-1 flex items-center justify-center px-margin-mobile">
          <div className="max-w-md w-full bg-surface-container-low rounded-2xl p-lg card-border flex flex-col gap-4">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center">Saving video…</h2>
            <div className="flex flex-col gap-3 mt-2">
              {steps.map((step, idx) => {
                const done = currentIndex > idx || (currentIndex === -1 && idx === 0 && material.status === 'processing');
                const active = idx === currentIndex;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        done ? 'text-secondary' : active ? 'text-primary animate-pulse' : 'text-outline-variant'
                      }`}
                    >
                      {done ? 'check_circle' : active ? 'progress_activity' : 'radio_button_unchecked'}
                    </span>
                    <span className={`font-body-md text-body-md ${done || active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Failed screen ---
  if (material && material.status === 'failed') {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />
        <main className="flex-1 flex items-center justify-center px-margin-mobile">
          <div className="max-w-md w-full bg-surface-container-low rounded-2xl p-lg card-border text-center flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-error text-[48px]">error</span>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Couldn't save this video</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{material.error_message}</p>
            <button
              type="button"
              onClick={handleAddAnother}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- Main form ---
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-lg">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">
              Add Learning Video
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              Paste a video link and organize it into your Smart Class Library.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-lg px-4 py-3 font-body-sm text-body-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleFetchInfo} className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
            <label className="font-label-md text-label-md text-on-surface-variant">Paste a video link</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-surface-dim border border-outline-variant/30 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
              />
              <button
                type="submit"
                disabled={fetchStatus === 'fetching' || !url.trim()}
                className="btn-gradient text-white font-label-md text-label-md px-6 py-3 rounded-lg font-semibold disabled:opacity-50 cursor-pointer shrink-0"
              >
                {fetchStatus === 'fetching' ? 'Fetching…' : 'Fetch Video'}
              </button>
            </div>
          </form>

          {info && (
            <div className="bg-surface-container-low rounded-xl p-md card-border flex flex-col sm:flex-row gap-md">
              {info.thumbnail && (
                <img
                  src={info.thumbnail}
                  alt="Video thumbnail"
                  className="w-full sm:w-48 rounded-lg object-cover aspect-video border border-outline-variant/20 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-headline-sm text-headline-sm font-semibold text-on-surface line-clamp-2">{info.title}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {formatDuration(info.duration)} {info.uploader ? `· ${info.uploader}` : ''}
                </p>
              </div>
            </div>
          )}

          {info && (
            <section className="bg-surface-container-low rounded-xl p-md card-border flex flex-col gap-sm">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">Organize Material</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    <option value="">Select…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  >
                    <option value="">Select…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Chapter</label>
                  <input
                    list="chapter-options"
                    value={chapterName}
                    onChange={(e) => {
                      setChapterName(e.target.value);
                      setPartTitle('');
                    }}
                    disabled={!classId || !subjectId}
                    placeholder="e.g. Motion"
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface disabled:opacity-50"
                  />
                  <datalist id="chapter-options">
                    {chapters.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  <p className="font-label-md text-label-md text-on-surface-variant/70 mt-1">
                    Pick an existing chapter or type a new one.
                  </p>
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Part</label>
                  <input
                    list="part-options"
                    value={partTitle}
                    onChange={(e) => setPartTitle(e.target.value)}
                    disabled={!chapterName.trim()}
                    placeholder="e.g. Part 2"
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface disabled:opacity-50"
                  />
                  <datalist id="part-options">
                    {partOptions.map((p) => (
                      <option key={p.id} value={p.title} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="mt-2 self-end px-8 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save to Library'}
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
