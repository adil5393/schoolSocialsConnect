import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopAppBar from './TopAppBar';
import BottomNavBar from './BottomNavBar';
import { useSidebar } from '../../context/SidebarContext';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isCollapsed } = useSidebar();
  const location = useLocation();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased overflow-x-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface-container-low p-4 flex flex-col shadow-2xl border-r border-outline-variant/20 z-50">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <img
                  src="/app-icon.png"
                  alt="SchoolSocialsConnect"
                  className="w-8 h-8 rounded-lg shadow-sm object-contain"
                />
                <span className="font-headline-sm font-bold text-primary">SchoolSocials</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer rounded-lg hover:bg-surface-variant/40"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {/* We render sidebar links and close on click */}
            <div className="flex-1 overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
              <Sidebar variant="drawer" onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        } transition-all duration-300 ease-in-out flex flex-col min-h-screen relative w-full overflow-x-hidden`}
      >
        <Outlet context={{ setMobileMenuOpen }} />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
}
