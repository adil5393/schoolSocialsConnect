import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function WorkspaceSwitcher({ size = 'default', className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isSmartClass = location.pathname.startsWith('/smart-class');
  const isSocials = !isSmartClass && location.pathname !== '/';

  const handleSelectWorkspace = (workspace) => {
    if (workspace === 'smart-class' && !isSmartClass) {
      navigate('/smart-class');
    } else if (workspace === 'socials' && !isSocials) {
      navigate('/dashboard');
    }
  };

  const isCompact = size === 'compact';

  return (
    <div
      className={`inline-flex items-center bg-surface-container-lowest/80 backdrop-blur-md p-1 rounded-xl border border-outline-variant/20 shadow-inner ${className}`}
      role="group"
      aria-label="Workspace Switcher"
    >
      {/* SOCIALS */}
      <button
        type="button"
        onClick={() => handleSelectWorkspace('socials')}
        className={`flex items-center gap-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isCompact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs md:text-sm'
        } ${
          isSocials
            ? 'bg-gradient-to-r from-primary-container to-primary text-on-primary-container font-bold shadow-md'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 font-medium'
        }`}
        title="Switch to Social Media Manager"
      >
        <span
          className={`material-symbols-outlined ${isCompact ? 'text-[16px]' : 'text-[18px]'}`}
          style={isSocials ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          campaign
        </span>
        <span className="tracking-wide uppercase font-semibold">Socials</span>
      </button>

      {/* SMART CLASS */}
      <button
        type="button"
        onClick={() => handleSelectWorkspace('smart-class')}
        className={`flex items-center gap-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isCompact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs md:text-sm'
        } ${
          isSmartClass
            ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-bold shadow-md'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 font-medium'
        }`}
        title="Switch to Smart Class Teaching Library"
      >
        <span
          className={`material-symbols-outlined ${isCompact ? 'text-[16px]' : 'text-[18px]'}`}
          style={isSmartClass ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          school
        </span>
        <span className="tracking-wide uppercase font-semibold">Smart Class</span>
      </button>
    </div>
  );
}
