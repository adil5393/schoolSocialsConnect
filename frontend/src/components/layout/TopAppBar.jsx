import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import WorkspaceSwitcher from './WorkspaceSwitcher';

export default function TopAppBar({ title, showSearch = false, searchPlaceholder = "Search...", onSearch, onToggleMobileMenu }) {
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="docked full-width top-0 sticky z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-xs h-16">
      {/* Mobile Title & Menu Toggle */}
      <div className="flex items-center gap-3 md:hidden">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="text-on-surface-variant hover:bg-surface-variant/30 rounded-full p-2 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <Link to="/dashboard" className="font-headline-sm text-headline-sm font-bold text-primary truncate flex items-center gap-2">
          <img
            src="/app-icon.png"
            alt="SchoolSocials"
            className="w-6 h-6 rounded-md object-contain shrink-0"
          />
          <span>SchoolSocials</span>
        </Link>
      </div>

      {/* Desktop Title / Search */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
        {title && <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</span>}
        {showSearch && (
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
              search
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-on-surface-variant/50"
            />
          </div>
        )}
      </div>

      {/* Workspace Switcher in center on desktop */}
      <div className="hidden lg:flex items-center mx-auto">
        <WorkspaceSwitcher size="default" />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-4 text-primary ml-auto relative">
        <button
          className="hover:bg-surface-variant/30 rounded-full p-2 active:opacity-80 transition-opacity text-on-surface-variant hover:text-primary relative"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
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
