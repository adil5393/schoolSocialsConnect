import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PortalChooserPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="w-14 h-14 rounded-lg bg-primary-container flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-on-primary-container text-2xl">school</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">SchoolSocials</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-10">
          Two separate, independent portals. Choose one to continue.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="bg-surface-container-low rounded-2xl p-8 card-border text-left hover:border-primary/50 transition-colors cursor-pointer glow-hover"
          >
            <span className="material-symbols-outlined text-primary text-[36px] mb-3 block">campaign</span>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Social Media Manager</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Publish and schedule posts to Facebook, Instagram, and WhatsApp.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/smart-class/login')}
            className="bg-surface-container-low rounded-2xl p-8 card-border text-left hover:border-primary/50 transition-colors cursor-pointer glow-hover"
          >
            <span className="material-symbols-outlined text-secondary text-[36px] mb-3 block">school</span>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">Smart Class Library</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Add and browse classroom videos by Class, Subject, Chapter, and Part.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
