import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/smartClassAuth.jsx';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const mainNavItems = [
  { name: 'Smart Class Home', path: '/smart-class', icon: 'home', exact: true },
  { name: 'My Classes', path: '/smart-class/classes', icon: 'school' },
  { name: 'Library Search', path: '/smart-class/library', icon: 'search' },
  { name: 'Curriculum Explorer', path: '/smart-class/curriculum', icon: 'account_tree' },
  { name: 'Recent Lessons', path: '/smart-class/recent', icon: 'history' },
  { name: 'Favorites', path: '/smart-class/favorites', icon: 'star' },
  { name: 'Downloads / Offline', path: '/smart-class/offline', icon: 'download_for_offline' },
  { name: 'My Uploads', path: '/smart-class/my-uploads', icon: 'upload_file' },
];

const teacherToolItems = [
  { name: 'Add Material', path: '/smart-class/add-material', icon: 'add_circle', highlight: true },
  { name: 'Manage Material', path: '/smart-class/manage-material', icon: 'edit_note' },
  { name: 'Content Coverage', path: '/smart-class/coverage', icon: 'donut_large' },
];

const adminItems = [
  { name: 'Curriculum Structure', path: '/smart-class/admin/curriculum', icon: 'account_tree' },
  { name: 'Teachers & Subjects', path: '/smart-class/admin/teachers', icon: 'badge' },
  { name: 'Library Management', path: '/smart-class/admin/library-management', icon: 'storage' },
  { name: 'Manage Users', path: '/smart-class/admin/users', icon: 'admin_panel_settings' },
];

export default function SmartClassSidebar({ variant = 'desktop', onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/smart-class/login');
  };

  const isLinkActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const renderLink = (item) => {
    const active = isLinkActive(item);
    return (
      <NavLink
        key={item.name}
        to={item.path}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
          item.highlight
            ? active
              ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold shadow-md'
              : 'text-secondary hover:bg-secondary/10 font-semibold'
            : active
            ? 'text-secondary font-bold border-l-2 border-secondary bg-secondary/10'
            : 'text-on-surface-variant font-medium hover:bg-surface-variant/40 hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110"
          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {item.icon}
        </span>
        <span className="font-body-md text-body-md truncate">{item.name}</span>
      </NavLink>
    );
  };

  const asideClass =
    variant === 'desktop'
      ? 'bg-surface-container-low border-r border-outline-variant/10 h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col py-md px-sm z-50'
      : 'flex flex-col w-full h-full';

  return (
    <aside className={asideClass}>
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-container to-secondary flex items-center justify-center shrink-0 shadow-md">
          <span className="material-symbols-outlined text-on-secondary-container font-bold">school</span>
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-secondary truncate leading-tight">Smart Class</h1>
          <p className="font-label-md text-label-md text-on-surface-variant truncate">Teaching Library</p>
        </div>
      </div>

      {/* Top-Level Workspace Switcher */}
      <div className="mb-4 px-1">
        <WorkspaceSwitcher size="compact" className="w-full justify-center" />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 pb-4">
        {/* Main Nav */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
            Learning Library
          </p>
          {mainNavItems.map(renderLink)}
        </div>

        {/* Teacher Tools */}
        <div className="space-y-1 pt-2 border-t border-outline-variant/10">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
            Teacher Tools
          </p>
          {teacherToolItems.map(renderLink)}
        </div>

        {/* Admin Management */}
        {user?.role === 'admin' && (
          <div className="space-y-1 pt-2 border-t border-outline-variant/10">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
              Administration
            </p>
            {adminItems.map(renderLink)}
          </div>
        )}
      </nav>

      {/* Footer / Profile / Logout */}
      <div className="mt-auto pt-3 border-t border-outline-variant/10 space-y-1">
        {user && (
          <div className="px-3 py-1.5 rounded-lg bg-surface-variant/20 border border-outline-variant/10 mb-1" title={user.email}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                {(user.full_name || user.email || 'T')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate leading-tight">{user.full_name}</p>
                <p className="font-label-md text-[11px] text-on-surface-variant truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-error font-medium hover:bg-error-container/10 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-body-md text-body-md">Log out</span>
        </button>
      </div>
    </aside>
  );
}
