import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/smartClassAuth.jsx';

const navItems = [
  { name: 'Smart Class Library', path: '/smart-class/library', icon: 'school' },
  { name: 'Add Video', path: '/smart-class/add-video', icon: 'video_call' },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
    isActive
      ? 'text-primary font-bold border-l-2 border-primary bg-primary/5'
      : 'text-on-surface-variant font-medium hover:bg-surface-variant/50'
  }`;

export default function SmartClassSidebar({ variant = 'desktop' }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/smart-class/login');
  };

  const asideClass =
    variant === 'desktop'
      ? 'bg-surface-container-low border-r border-outline-variant/10 h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col py-md px-sm z-50'
      : 'flex flex-col w-full';

  return (
    <aside className={asideClass}>
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary-container">school</span>
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary truncate leading-tight">Smart Class</h1>
          <p className="font-label-md text-label-md text-on-surface-variant truncate">Learning Library</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path} className={linkClass}>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="font-body-md text-body-md">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-1">
        {user?.role === 'admin' && (
          <NavLink to="/smart-class/admin/users" className={linkClass}>
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            <span className="font-body-md text-body-md">Manage Users</span>
          </NavLink>
        )}
        {user && (
          <div className="px-3 pt-2 pb-1 truncate" title={user.email}>
            <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{user.full_name}</p>
            <p className="font-label-md text-label-md text-on-surface-variant truncate">{user.email}</p>
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
