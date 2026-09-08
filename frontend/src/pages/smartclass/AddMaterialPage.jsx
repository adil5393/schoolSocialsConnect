import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../lib/smartClassAuth';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;

function isValidYouTubeUrl(value) {
  return YOUTUBE_URL_REGEX.test(value.trim());
}

const CATEGORIES = [
  { id: 'learn', name: 'Teacher Explanation & Concept', icon: 'school', color: 'text-teal-400' },
  { id: 'understand', name: 'Worked Example & Visual', icon: 'lightbulb', color: 'text-amber-400' },
  { id: 'practice', name: 'Practice, Worksheet & NCERT', icon: 'assignment', color: 'text-yellow-400' },
  { id: 'reference', name: 'Book Material & Reference Notes', icon: 'menu_book', color: 'text-blue-400' },
];

const RESOURCE_TYPES = [
  { id: 'video', name: 'Video', icon: 'play_circle' },
  { id: 'pdf', name: 'PDF Document', icon: 'picture_as_pdf' },
  { id: 'image', name: 'Diagram / Image', icon: 'image' },
  { id: 'document', name: 'Presentation / PPT', icon: 'slideshow' },
  { id: 'worksheet', name: 'Worksheet', icon: 'assignment_turned_in' },
  { id: 'question_set', name: 'Question Set', icon: 'quiz' },
  { id: 'link', name: 'External Web Link', icon: 'link' },
  { id: 'audio', name: 'Audio Clip', icon: 'volume_up' },
];

const POLL_INTERVAL_MS = 2500;

export default function AddMaterialPage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  // Step 1 & 2: Class & Subject
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Step 3 & 4: Chapter & Topic / Part
  const [chapters, setChapters] = useState([]);
  const [chapterName, setChapterName] = useState('');
  const [partTitle, setPartTitle] = useState('');
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Step 5: Resource Category
  const [category, setCategory] = useState('learn');

  // Step 6: Resource Type
  const [resourceType, setResourceType] = useState('video');

  // Step 7: Source Method (Upload or Paste Link)
  const [sourceMode, setSourceMode] = useState('upload'); // 'upload' | 'link'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState('idle'); // idle | fetching | ready | error
  const [videoInfo, setVideoInfo] = useState(null);

  // Step 8: Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Teacher Upload');
  const [tags, setTags] = useState('');

  // Processing & Save States
  const [saving, setSaving] = useState(false);
  const [savedMaterial, setSavedMaterial] = useState(null);
  const [duplicateNotice, setDuplicateNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load classes and subjects on mount
  useEffect(() => {
    (async () => {
      try {
        const [clsData, subData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
        ]);
        setClasses(clsData);
        setSubjects(subData);
        if (clsData.length > 0) setClassId(String(clsData[0].id));
        if (subData.length > 0) setSubjectId(String(subData[0].id));
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : 'Failed to load classes');
      }
    })();
  }, []);

  // Load existing chapters for autocomplete / selection
  useEffect(() => {
    if (!classId || !subjectId) {
      setChapters([]);
      return;
    }
    setLoadingChapters(true);
    apiFetch(`/library/classes/${classId}/subjects/${subjectId}/chapters`)
      .then(setChapters)
      .catch(() => setChapters([]))
      .finally(() => setLoadingChapters(false));
  }, [classId, subjectId]);

  // Find matching chapter for part hints
  const matchingChapter = useMemo(
    () => chapters.find((c) => c.name.toLowerCase() === chapterName.trim().toLowerCase()),
    [chapters, chapterName]
  );
  const partOptions = matchingChapter?.parts || [];

  // Selected Class & Subject Names for Live Preview
  const selectedClassObj = classes.find((c) => String(c.id) === String(classId));
  const selectedSubjectObj = subjects.find((s) => String(s.id) === String(subjectId));
  const selectedCategoryObj = CATEGORIES.find((c) => c.id === category);

  // Handle YouTube info fetch
  const handleFetchYouTube = async (e) => {
    e?.preventDefault();
    if (!isValidYouTubeUrl(url)) {
      setFetchStatus('error');
      setErrorMessage("Please enter a valid YouTube video link.");
      return;
    }
    setFetchStatus('fetching');
    setErrorMessage('');
    try {
      const data = await apiFetch('/library/video-info', {
        method: 'POST',
        body: { url: url.trim() },
      });
      setVideoInfo(data);
      setTitle((cur) => cur || data.title);
      setSource('YouTube');
      setResourceType('video');
      setFetchStatus('ready');
    } catch (err) {
      setFetchStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Failed to fetch video information');
    }
  };

  // Handle File upload change
  // Handle File upload change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const inferredTitle = file.name.replace(/\.[^/.]+$/, '');
    setTitle((cur) => cur || inferredTitle);

    const nameLower = file.name.toLowerCase();
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(nameLower)) {
      setResourceType('video');
    } else if (file.type === 'application/pdf' || /\.pdf$/i.test(nameLower)) {
      setResourceType('pdf');
    } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(nameLower)) {
      setResourceType('image');
      setFilePreviewUrl(URL.createObjectURL(file));
    } else if (
      file.type.includes('powerpoint') ||
      file.type.includes('presentation') ||
      /\.(ppt|pptx|pps|ppsx|odp|key)$/i.test(nameLower)
    ) {
      setResourceType('presentation');
    } else {
      setResourceType('document');
    }
    setErrorMessage('');
  };

  // Poll processing video if pending
  useEffect(() => {
    if (!savedMaterial || savedMaterial.status === 'ready' || savedMaterial.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const updated = await apiFetch(`/library/materials/${savedMaterial.id}`);
        setSavedMaterial(updated);
      } catch {
        // retry next tick
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [savedMaterial]);

  // Validation
  const hasContent = sourceMode === 'link' ? (fetchStatus === 'ready' || url.trim().length > 0) : !!selectedFile;
  const canSave = hasContent && title.trim() && classId && subjectId && chapterName.trim() && partTitle.trim();

  // Save to Library
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setErrorMessage('');
    setDuplicateNotice(null);

    try {
      let data;
      if (sourceMode === 'link') {
        data = await apiFetch('/library/materials', {
          method: 'POST',
          body: {
            url: url.trim(),
            title: title.trim(),
            class_id: Number(classId),
            subject_id: Number(subjectId),
            chapter_name: chapterName.trim(),
            part_title: partTitle.trim(),
            category,
            resource_type: resourceType,
            description: description.trim() || undefined,
            source: source.trim() || 'Online Link',
            tags: tags.trim() || undefined,
          },
        });
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        formData.append('class_id', classId);
        formData.append('subject_id', subjectId);
        formData.append('chapter_name', chapterName.trim());
        formData.append('part_title', partTitle.trim());
        formData.append('category', category);
        formData.append('resource_type', resourceType);
        if (description.trim()) formData.append('description', description.trim());
        if (source.trim()) formData.append('source', source.trim());
        if (tags.trim()) formData.append('tags', tags.trim());

        data = await apiFetch('/library/materials/upload', {
          method: 'POST',
          body: formData,
          isFormData: true,
        });
      }

      setSavedMaterial(data.material);
      if (data.reused_existing_asset && data.other_locations?.length > 0) {
        setDuplicateNotice(data.other_locations);
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setFetchStatus('idle');
    setVideoInfo(null);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setTitle('');
    setDescription('');
    setTags('');
    setSavedMaterial(null);
    setDuplicateNotice(null);
    setErrorMessage('');
  };

  // --- Success / Processing State Screen ---
  if (savedMaterial) {
    const isProcessing = savedMaterial.status === 'pending' || savedMaterial.status === 'processing';
    const isFailed = savedMaterial.status === 'failed';

    return (
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        <SmartClassTopBar onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-surface-container-low rounded-3xl p-8 border border-secondary/40 shadow-2xl text-center flex flex-col items-center gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isProcessing
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                  : isFailed
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                  : 'bg-secondary/15 border border-secondary/30 text-secondary'
              }`}
            >
              {isProcessing ? (
                <span className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
              ) : isFailed ? (
                <span className="material-symbols-outlined text-[36px]">info</span>
              ) : (
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              )}
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-secondary">
                {isProcessing
                  ? 'Material Saved — Processing Media'
                  : isFailed
                  ? 'Material Saved in Library'
                  : 'Material Successfully Saved'}
              </span>
              <h2 className="font-headline-md text-2xl font-bold text-on-surface mt-1">{savedMaterial.title}</h2>
              {isProcessing && (
                <p className="text-xs text-on-surface-variant mt-1.5 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span>
                    {savedMaterial.processing_stage
                      ? `Stage: ${savedMaterial.processing_stage}...`
                      : 'Converting slides & generating high-res previews...'}
                  </span>
                </p>
              )}
              {isFailed && (
                <p className="text-xs text-on-surface-variant mt-1.5">
                  {savedMaterial.error_message || 'Original file is safely stored. Presentation preview could not be generated.'}
                </p>
              )}
            </div>

            {/* Saved Location Card */}
            <div className="w-full bg-surface-dim p-4 rounded-2xl border border-outline-variant/20 text-left space-y-2">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Curriculum Destination:</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface font-semibold">
                <span className="px-2 py-0.5 rounded bg-secondary/20 text-secondary">Class {savedMaterial.class_name}</span>
                <span>→</span>
                <span>{savedMaterial.subject_name}</span>
                <span>→</span>
                <span>{savedMaterial.chapter_name}</span>
                <span>→</span>
                <span className="text-secondary">{savedMaterial.part_title}</span>
              </div>
            </div>

            {duplicateNotice && (
              <p className="text-xs text-on-surface-variant bg-surface-dim p-3 rounded-xl border border-outline-variant/20">
                This media was already stored in: {duplicateNotice.join(', ')}. It has been assigned to this topic instantly without duplicating storage.
              </p>
            )}

            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/smart-class/curriculum/${savedMaterial.class_id}/${savedMaterial.subject_id}/${savedMaterial.chapter_id}`
                  )
                }
                className="flex-1 py-3 bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container rounded-xl font-bold text-sm hover:opacity-95 shadow-lg cursor-pointer"
              >
                Open in Chapter Workspace
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-5 border border-outline-variant/30 text-on-surface rounded-xl font-bold text-sm hover:bg-surface-variant/40 cursor-pointer"
              >
                Add Another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[
          { label: 'Add Material' }
        ]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          {/* Header */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">Structured Teaching Ingestion</span>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface mt-1">
              Add Smart Class Material
            </h1>
            <p className="text-sm text-on-surface-variant">
              Follow the simple 8-step wizard to place your teaching material directly into the school's curriculum structure.
            </p>
          </div>

          {/* LIVE DESTINATION BREADCRUMB PREVIEW BANNER */}
          <div className="bg-gradient-to-r from-surface-container-high to-surface-container-low p-4 md:p-5 rounded-2xl border border-secondary/40 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span>Saving Directly To:</span>
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">Live Curriculum Destination</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold text-on-surface">
              <span className="px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary border border-secondary/30">
                Class {selectedClassObj?.name || '...'}
              </span>
              <span className="text-outline-variant">→</span>
              <span className="px-2 py-1 rounded-lg bg-surface-dim border border-outline-variant/20">
                {selectedSubjectObj?.name || '...'}
              </span>
              <span className="text-outline-variant">→</span>
              <span className="px-2 py-1 rounded-lg bg-surface-dim border border-outline-variant/20">
                {chapterName.trim() || '(Enter Chapter Name)'}
              </span>
              <span className="text-outline-variant">→</span>
              <span className="px-2 py-1 rounded-lg bg-surface-dim border border-outline-variant/20 text-secondary">
                {partTitle.trim() || '(Enter Topic Title)'}
              </span>
              <span className="text-outline-variant">→</span>
              <span className="px-2 py-1 rounded-lg bg-secondary-container/20 text-secondary border border-secondary/30">
                {selectedCategoryObj?.name || 'Category'}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          {/* 8-STEP WIZARD FORM */}
          <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 border border-outline-variant/20 shadow-md space-y-8">
            {/* STEP 1 & 2: CLASS & SUBJECT */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span>Choose Class & Subject</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Class / Grade *</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* STEP 3 & 4: CHAPTER & TOPIC / PART */}
            <div className="pt-6 border-t border-outline-variant/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  2
                </span>
                <span>Choose or Type Chapter & Topic</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chapter Name with Autocomplete dropdown suggestions */}
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Chapter Name *
                  </label>
                  <input
                    type="text"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="e.g. Pair of Linear Equations in Two Variables"
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  />
                  {chapters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-on-surface-variant/70 self-center">Existing:</span>
                      {chapters.slice(0, 4).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChapterName(c.name)}
                          className="px-2 py-0.5 rounded-md bg-surface-dim hover:bg-surface-variant border border-outline-variant/20 text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer truncate max-w-[150px]"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Topic / Part Name */}
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Topic / Concept Part *
                  </label>
                  <input
                    type="text"
                    value={partTitle}
                    onChange={(e) => setPartTitle(e.target.value)}
                    placeholder="e.g. Graphical Method"
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary"
                  />
                  {partOptions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-on-surface-variant/70 self-center">Existing in Chapter:</span>
                      {partOptions.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPartTitle(p.title)}
                          className="px-2 py-0.5 rounded-md bg-surface-dim hover:bg-surface-variant border border-outline-variant/20 text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer truncate max-w-[150px]"
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 5: RESOURCE CATEGORY */}
            <div className="pt-6 border-t border-outline-variant/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  3
                </span>
                <span>Choose Learning Experience Category</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-secondary/15 border-secondary text-on-surface shadow-sm'
                          : 'bg-surface-container-high/40 border-outline-variant/20 hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <div className={`p-2 rounded-xl bg-surface-dim ${cat.color}`}>
                        <span className="material-symbols-outlined text-[22px] block">{cat.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-on-surface">{cat.name}</p>
                        <p className="text-[11px] text-on-surface-variant/70">
                          {cat.id === 'learn' && 'Core explanation & foundation'}
                          {cat.id === 'understand' && 'Worked examples & visuals'}
                          {cat.id === 'practice' && 'Assessments & questions'}
                          {cat.id === 'reference' && 'PDF notes & diagrams'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 6: RESOURCE TYPE */}
            <div className="pt-6 border-t border-outline-variant/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  4
                </span>
                <span>Choose Resource Format / Type</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {RESOURCE_TYPES.map((t) => {
                  const isSelected = resourceType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setResourceType(t.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'bg-secondary/15 border-secondary text-secondary font-bold shadow-sm'
                          : 'bg-surface-container-high/40 border-outline-variant/20 hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
                      <span className="text-xs font-semibold">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 7: UPLOAD FILE OR PASTE LINK */}
            <div className="pt-6 border-t border-outline-variant/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  5
                </span>
                <span>Source: Upload File OR Paste Link</span>
              </h3>

              {/* Source Switcher */}
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setSourceMode('upload')}
                  className={`flex-1 py-2.5 px-4 rounded-xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    sourceMode === 'upload'
                      ? 'bg-secondary text-on-secondary-container border-secondary shadow-md'
                      : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span>Upload Local File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode('link')}
                  className={`flex-1 py-2.5 px-4 rounded-xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    sourceMode === 'link'
                      ? 'bg-secondary text-on-secondary-container border-secondary shadow-md'
                      : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">link</span>
                  <span>Paste YouTube / Web Link</span>
                </button>
              </div>

              {sourceMode === 'upload' ? (
                <div className="border-2 border-dashed border-outline-variant/40 hover:border-secondary/50 rounded-2xl p-6 text-center bg-surface-container-high/30 transition-colors">
                  <input
                    type="file"
                    id="material-file-upload"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="video/*,application/pdf,image/*,.ppt,.pptx,.doc,.docx"
                  />
                  <label htmlFor="material-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[42px] text-secondary">cloud_upload</span>
                    <p className="text-sm font-bold text-on-surface">
                      {selectedFile ? selectedFile.name : 'Click to select a file or drag and drop here'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Supports Videos (MP4, MKV), PDFs, Diagrams (PNG, JPEG), Presentations (PPTX)
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setFetchStatus('idle');
                      }}
                      placeholder="Paste YouTube or public resource link (e.g. https://youtu.be/...)"
                      className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleFetchYouTube}
                      disabled={fetchStatus === 'fetching' || !url.trim()}
                      className="px-5 py-2.5 bg-surface-variant text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/30 disabled:opacity-50"
                    >
                      {fetchStatus === 'fetching' ? 'Fetching...' : 'Fetch Info'}
                    </button>
                  </div>

                  {videoInfo && (
                    <div className="p-3 bg-surface-dim rounded-xl border border-secondary/30 flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[24px]">play_circle</span>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-on-surface truncate">{videoInfo.title}</p>
                        <p className="text-on-surface-variant">{videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)} mins` : 'YouTube Link'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 8: METADATA & SAVE */}
            <div className="pt-6 border-t border-outline-variant/10 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary-container flex items-center justify-center text-xs font-black">
                  6
                </span>
                <span>Add Details & Save to Library</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Resource Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Graphical Method — Worked Solutions and Graphs"
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Source / Attribution</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. NCERT Textbook / Mathematics Dept"
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Optional Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. board-exam, visual, formulas"
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1">Short Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key concepts or instructions for teachers and students..."
                  className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              {/* SAVE ACTION BUTTON */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-base hover:opacity-95 shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-4"
              >
                {saving ? (
                  <>
                    <span className="w-5 h-5 border-2 border-on-secondary-container border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Library...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[22px]">save</span>
                    <span>SAVE TO LIBRARY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
