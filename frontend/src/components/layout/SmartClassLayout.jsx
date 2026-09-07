import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SmartClassSidebar from './SmartClassSidebar';

export default function SmartClassLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      <SmartClassSidebar />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface-container-low p-4 flex flex-col shadow-2xl border-r border-outline-variant/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-sm">school</span>
                </div>
                <span className="font-headline-sm font-bold text-primary">Smart Class</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div onClick={() => setMobileMenuOpen(false)}>
              <SmartClassSidebar variant="drawer" />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative w-full">
        <Outlet context={{ setMobileMenuOpen }} />
      </div>
    </div>
  );
}
