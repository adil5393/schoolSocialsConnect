import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/smartClassAuth.jsx';

export default function SmartClassTopBar({ onToggleMobileMenu }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="docked full-width top-0 sticky z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-xs h-16">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-on-surface-variant hover:bg-surface-variant/30 rounded-full p-2 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <Link to="/smart-class/library" className="font-headline-sm text-headline-sm font-bold text-primary truncate">
          Smart Class Library
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-4 text-primary ml-auto relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="hover:bg-surface-variant/30 rounded-full p-1 active:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
          aria-label="User Profile"
        >
          <div className="w-8 h-8 rounded-full border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md font-bold">
            {initials}
          </div>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 z-50 w-56 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl p-3">
              <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{user?.full_name}</p>
              <p className="font-label-md text-label-md text-on-surface-variant truncate mb-3">{user?.email}</p>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-error hover:bg-error-container/10 font-label-md text-label-md flex items-center gap-2 cursor-pointer"
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
