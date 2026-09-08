import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { useSidebar } from '../../context/SidebarContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';

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

export default function Sidebar({ variant = 'desktop', onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const currentPath = location.pathname + location.search;

  const isDrawer = variant === 'drawer';
  const collapsed = isCollapsed && !isDrawer;

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <div className="flex items-center justify-between gap-2 mb-4 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/app-icon.png"
              alt="SchoolSocialsConnect"
              className="w-9 h-9 rounded-xl shadow-md shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="font-headline-sm text-sm font-bold text-primary truncate leading-tight">SchoolSocials</h1>
              <p className="font-label-md text-[11px] text-on-surface-variant truncate">Social Hub</p>
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
        <div className="flex flex-col items-center mb-4">
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

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5 pb-3">
        {navItems.map((item) => {
          const isActive = item.matchPath
            ? currentPath === item.matchPath
            : location.pathname === item.path && !location.search;

          if (collapsed) {
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`relative group flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
                aria-label={item.name}
              >
                <span
                  className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>

                {/* Floating Tooltip */}
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                  : 'text-on-surface-variant font-medium hover:bg-surface-variant/50 hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md truncate">{item.name}</span>
            </NavLink>
          );
        })}

        {/* YouTube Downloader Divider & Link */}
        {collapsed ? (
          <div className="my-2 border-t border-outline-variant/10 w-8 mx-auto" />
        ) : (
          <div className="my-2 border-t border-outline-variant/10" />
        )}

        {collapsed ? (
          <NavLink
            to="/youtube-downloader"
            onClick={onClose}
            className={({ isActive }) =>
              `relative group flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
            aria-label="YouTube Downloader"
          >
            <span className="material-symbols-outlined text-[22px]">download</span>
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              YouTube Downloader
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/youtube-downloader"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                  : 'text-on-surface-variant font-medium hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="font-body-md text-body-md">YouTube Downloader</span>
          </NavLink>
        )}
      </nav>

      {/* Footer / Settings / Logout */}
      <div className="mt-auto pt-3 border-t border-outline-variant/10 space-y-1">
        {collapsed ? (
          <NavLink
            to="/accounts"
            onClick={onClose}
            className={({ isActive }) =>
              `relative group flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Settings
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/accounts"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                  : 'text-on-surface-variant font-medium hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-body-md text-body-md">Settings</span>
          </NavLink>
        )}

        {user?.role === 'admin' && (
          collapsed ? (
            <NavLink
              to="/admin/users"
              onClick={onClose}
              className={({ isActive }) =>
                `relative group flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                }`
              }
              aria-label="Manage Users"
            >
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Manage Users
              </div>
            </NavLink>
          ) : (
            <NavLink
              to="/admin/users"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
                    : 'text-on-surface-variant font-medium hover:bg-surface-variant/50 hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              <span className="font-body-md text-body-md">Manage Users</span>
            </NavLink>
          )
        )}

        {user && (
          collapsed ? (
            <div className="relative group flex justify-center py-1">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shadow-sm cursor-default">
                {(user.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs rounded-lg shadow-xl border border-outline-variant/30 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <p className="font-bold">{user.full_name}</p>
                <p className="text-[11px] text-on-surface-variant">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="px-3 pt-2 pb-1 truncate" title={user.email}>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{user.full_name}</p>
              <p className="font-label-md text-label-md text-on-surface-variant truncate">{user.email}</p>
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
