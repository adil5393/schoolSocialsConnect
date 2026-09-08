import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import SmartClassTopBar from '../../../components/layout/SmartClassTopBar';
import { apiFetch, ApiError } from '../../../lib/smartClassAuth';

export default function AdminLibraryManagementPage() {
  const outletContext = useOutletContext();
  const setMobileMenuOpen = outletContext?.setMobileMenuOpen;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clsData, subData, matsData] = await Promise.all([
          apiFetch('/library/classes'),
          apiFetch('/library/subjects'),
          apiFetch('/library/materials'),
        ]);
        setClasses(clsData);
        setSubjects(subData);
        setMaterials(matsData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load library stats');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const videoCount = materials.filter((m) => m.media_type === 'video').length;
  const pdfCount = materials.filter((m) => m.media_type === 'pdf' || m.resource_type === 'pdf').length;
  const imageCount = materials.filter((m) => m.media_type === 'image' || m.resource_type === 'image').length;
  const docCount = materials.filter((m) => m.media_type === 'document' || m.resource_type === 'document').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <SmartClassTopBar
        breadcrumbs={[{ label: 'Administration' }, { label: 'Library Management' }]}
        onToggleMobileMenu={() => setMobileMenuOpen && setMobileMenuOpen(true)}
      />

      <main className="flex-1 w-full overflow-y-auto pb-32 md:pb-24">
        <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-md md:py-lg flex flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold mb-2">
              <span className="material-symbols-outlined text-[14px]">storage</span>
              <span>Storage & Storage Health</span>
            </div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">
              Smart Class Library Management
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Storage deduplication statistics, media health, and institutional content overview.
            </p>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 text-error rounded-xl p-4 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-blue-400 text-[28px] mb-2 block">play_circle</span>
              <p className="text-2xl font-black text-on-surface">{videoCount}</p>
              <p className="text-xs text-on-surface-variant">Classroom Videos</p>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-red-400 text-[28px] mb-2 block">picture_as_pdf</span>
              <p className="text-2xl font-black text-on-surface">{pdfCount}</p>
              <p className="text-xs text-on-surface-variant">PDFs & Notes</p>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-amber-400 text-[28px] mb-2 block">image</span>
              <p className="text-2xl font-black text-on-surface">{imageCount}</p>
              <p className="text-xs text-on-surface-variant">Diagrams & Images</p>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-orange-400 text-[28px] mb-2 block">slideshow</span>
              <p className="text-2xl font-black text-on-surface">{docCount}</p>
              <p className="text-xs text-on-surface-variant">Presentations / Docs</p>
            </div>
          </div>

          {/* Deduplication & Storage Health Info Card */}
          <section className="bg-surface-container-low p-6 rounded-2xl border border-secondary/30 shadow-md space-y-3">
            <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">verified</span>
              <span>Automatic Storage Deduplication Enabled</span>
            </h3>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
              When teachers across different classes or subjects assign the same video or PDF to multiple topics, the system reuses the existing physical object in MinIO object storage. The media file is downloaded and normalized only once, saving server bandwidth and disk space.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
