import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/smartClassAuth.jsx';
import { useSidebar } from '../../context/SidebarContext';
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
  const { isCollapsed, toggleSidebar } = useSidebar();

  const isDrawer = variant === 'drawer';
  const collapsed = isCollapsed && !isDrawer;

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

    if (collapsed) {
      return (
        <NavLink
          key={item.name}
          to={item.path}
          onClick={onClose}
          className={`relative group flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            item.highlight
              ? active
                ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold shadow-md'
                : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
              : active
              ? 'bg-secondary/15 text-secondary border border-secondary/30 font-bold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
          }`}
          aria-label={item.name}
        >
          <span
            className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110"
            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>

          {/* Floating Tooltip on Hover */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {item.name}
          </div>
        </NavLink>
      );
    }

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

  const asideClass = !isDrawer
    ? `bg-surface-container-low border-r border-outline-variant/10 h-screen fixed left-0 top-0 hidden md:flex flex-col py-4 ${
        collapsed ? 'w-20 px-2' : 'w-64 px-3'
      } transition-all duration-300 ease-in-out z-50`
    : 'flex flex-col w-full h-full';

  return (
    <aside className={asideClass}>
      {/* Brand Header */}
      {!collapsed ? (
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/app-icon.png"
              alt="SchoolSocialsConnect"
              className="w-9 h-9 rounded-xl shadow-md shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="font-headline-sm text-sm font-bold text-secondary truncate leading-tight">Smart Class</h1>
              <p className="font-label-md text-[11px] text-on-surface-variant truncate">Teaching Library</p>
            </div>
          </div>
          {!isDrawer && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 rounded-lg cursor-pointer transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center mb-3">
          <img
            src="/app-icon.png"
            alt="SchoolSocialsConnect"
            className="w-10 h-10 rounded-xl shadow-md object-contain hover:scale-105 transition-transform"
          />
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expand sidebar"
            className="mt-2 w-full flex items-center justify-center p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 rounded-lg cursor-pointer transition-colors"
            aria-label="Expand sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Top-Level Workspace Switcher */}
      <div className="mb-4 px-0.5">
        <WorkspaceSwitcher size="compact" collapsed={collapsed} className="w-full justify-center" />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-0.5 pb-4">
        {/* Main Nav */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
              Learning Library
            </p>
          )}
          {mainNavItems.map(renderLink)}
        </div>

        {/* Teacher Tools */}
        <div className={`space-y-1 ${!collapsed ? 'pt-2 border-t border-outline-variant/10' : ''}`}>
          {collapsed ? (
            <div className="my-2 border-t border-outline-variant/10 w-8 mx-auto" />
          ) : (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
              Teacher Tools
            </p>
          )}
          {teacherToolItems.map(renderLink)}
        </div>

        {/* Admin Management */}
        {user?.role === 'admin' && (
          <div className={`space-y-1 ${!collapsed ? 'pt-2 border-t border-outline-variant/10' : ''}`}>
            {collapsed ? (
              <div className="my-2 border-t border-outline-variant/10 w-8 mx-auto" />
            ) : (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">
                Administration
              </p>
            )}
            {adminItems.map(renderLink)}
          </div>
        )}
      </nav>

      {/* Footer / Profile / Logout */}
      <div className="mt-auto pt-3 border-t border-outline-variant/10 space-y-1">
        {user && (
          collapsed ? (
            <div className="relative group flex justify-center py-1">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shadow-sm cursor-default">
                {(user.full_name || user.email || 'T')[0].toUpperCase()}
              </div>
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <p className="font-bold">{user.full_name}</p>
                <p className="text-[11px] text-on-surface-variant">{user.email}</p>
              </div>
            </div>
          ) : (
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
          )
        )}

        {collapsed ? (
          <div className="relative group flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-error hover:bg-error-container/10 cursor-pointer transition-colors flex items-center justify-center w-full"
              aria-label="Log out"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-error text-xs font-semibold rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Log out
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-error font-medium hover:bg-error-container/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-body-md text-body-md">Log out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
