import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/smartClassAuth.jsx';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function SmartClassTopBar({ breadcrumbs = [], onToggleMobileMenu }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/smart-class/login');
  };

  return (
    <header className="docked full-width top-0 sticky z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-xs h-16">
      {/* Mobile Title & Menu Toggle */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-on-surface-variant hover:bg-surface-variant/30 rounded-full p-2 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        
        {/* Breadcrumb Navigation or Brand */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            to="/smart-class"
            className="font-headline-sm text-headline-sm font-bold text-secondary hover:text-secondary-fixed transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">school</span>
            <span>Smart Class</span>
          </Link>

          {breadcrumbs.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-on-surface-variant text-sm truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-outline-variant text-xs">/</span>
                  {crumb.path ? (
                    <Link
                      to={crumb.path}
                      className="hover:text-secondary font-medium transition-colors truncate max-w-[140px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-on-surface font-semibold truncate max-w-[160px]">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Workspace Switcher (Desktop) */}
      <div className="hidden lg:flex items-center mx-auto">
        <WorkspaceSwitcher size="default" />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 ml-auto relative">
        {/* Quick Search */}
        <button
          type="button"
          onClick={() => navigate('/smart-class/library')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant border border-outline-variant/20 text-on-surface-variant text-xs transition-colors cursor-pointer"
          title="Search Teaching Library"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          <span>Search library...</span>
        </button>

        {/* Add Material Button */}
        <button
          type="button"
          onClick={() => navigate('/smart-class/add-material')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-semibold text-xs md:text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span className="hidden sm:inline">Add Material</span>
        </button>

        {/* User Profile */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="hover:bg-surface-variant/30 rounded-full p-1 active:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer ml-1"
          aria-label="User Profile"
        >
          <div className="w-8 h-8 rounded-full border border-secondary/40 bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-md text-label-md font-bold">
            {initials}
          </div>
        </button>

        {/* User Profile Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 z-50 w-60 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 mb-2 border-b border-outline-variant/10">
                <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{user?.full_name}</p>
                <p className="font-label-md text-label-md text-on-surface-variant truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary">
                  {user?.role || 'Teacher'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/smart-class/my-uploads');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-on-surface hover:bg-surface-variant/40 font-body-sm text-body-sm flex items-center gap-2 cursor-pointer mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span> My Uploads
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/smart-class/favorites');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-on-surface hover:bg-surface-variant/40 font-body-sm text-body-sm flex items-center gap-2 cursor-pointer mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">star</span> Favorites
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-error hover:bg-error-container/10 font-label-md text-label-md flex items-center gap-2 cursor-pointer border-t border-outline-variant/10 pt-2"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
