import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Create Post', path: '/create', icon: 'add_box' },
  { name: 'Posts', path: '/content', icon: 'article' },
  { name: 'Scheduled', path: '/content?status=scheduled', icon: 'schedule', matchPath: '/content?status=scheduled' },
  { name: 'Drafts', path: '/content?status=drafts', icon: 'drafts', matchPath: '/content?status=drafts' },
  { name: 'Calendar', path: '/calendar', icon: 'calendar_month' },
  { name: 'Media Library', path: '/media', icon: 'photo_library' },
  { name: 'Social Accounts', path: '/accounts', icon: 'share_reviews' },
  { name: 'Analytics', path: '/dashboard#analytics', icon: 'monitoring' },
  { name: 'Activity', path: '/dashboard#activity', icon: 'history' },
];

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  return (
    <aside className="bg-surface-container-low border-r border-outline-variant/10 h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col py-md px-sm z-50">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary-container">school</span>
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary truncate leading-tight">SchoolSocials</h1>
          <p className="font-label-md text-label-md text-on-surface-variant truncate">Institutional Innovation</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
        {navItems.map((item) => {
          const isActive =
            item.matchPath
              ? currentPath === item.matchPath
              : location.pathname === item.path && !location.search;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                  : 'text-on-surface-variant font-medium hover:bg-surface-variant/50'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Settings */}
      <div className="mt-auto pt-4 border-t border-outline-variant/10">
        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
              isActive
                ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                : 'text-on-surface-variant font-medium hover:bg-surface-variant/50'
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="font-body-md text-body-md">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
