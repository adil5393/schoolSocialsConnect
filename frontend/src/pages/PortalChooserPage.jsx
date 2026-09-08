import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PortalChooserPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl text-center relative z-10">
        <img
          src="/app-icon.png"
          alt="SchoolSocialsConnect"
          className="w-20 h-20 rounded-3xl shadow-2xl object-contain mx-auto mb-6 hover:scale-105 transition-transform"
        />
        <h1 className="font-headline-lg text-3xl md:text-4xl font-black text-on-surface mb-3 tracking-tight">
          SchoolSocialsConnect
        </h1>
        <p className="font-body-md text-sm md:text-base text-on-surface-variant mb-10 max-w-lg mx-auto">
          Two dedicated, independent workspaces built for institutional communication and digital teaching.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {/* WORKSPACE 1: SOCIALS */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="group bg-surface-container-low hover:bg-surface-container rounded-3xl p-8 border border-outline-variant/20 hover:border-primary/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-primary/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-primary mb-1 block">Workspace 1</span>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
                Social Media Manager
              </h2>
              <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mb-6">
                Publish, schedule, and analyze updates across Facebook, Instagram, and WhatsApp for the school community.
              </p>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between text-xs font-bold text-primary">
              <span>Open Socials Workspace</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </button>

          {/* WORKSPACE 2: SMART CLASS */}
          <button
            type="button"
            onClick={() => navigate('/smart-class/login')}
            className="group bg-surface-container-low hover:bg-surface-container rounded-3xl p-8 border border-outline-variant/20 hover:border-secondary/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-secondary/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-secondary text-[28px]">school</span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-secondary mb-1 block">Workspace 2</span>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2 group-hover:text-secondary transition-colors">
                Smart Class Teaching Library
              </h2>
              <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mb-6">
                Structured digital curriculum library. Explore Class → Subject → Chapter → Topic and present interactive materials on smart screens.
              </p>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between text-xs font-bold text-secondary">
              <span>Open Smart Class Workspace</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

