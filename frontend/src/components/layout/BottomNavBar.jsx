import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function BottomNavBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 w-full z-50 md:hidden bg-surface-container-highest/90 backdrop-blur-lg border-t border-outline-variant/10 shadow-xl flex justify-around items-center px-4 py-2 pb-safe">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-all ${
            isActive
              ? 'text-secondary bg-secondary-container/20 scale-90'
              : 'text-on-surface-variant active:bg-surface-variant'
          }`
        }
      >
        <span className="material-symbols-outlined text-[22px]">home</span>
        <span className="font-label-md text-[10px] mt-0.5">Home</span>
      </NavLink>

      <NavLink
        to="/content"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-all ${
            isActive
              ? 'text-secondary bg-secondary-container/20 scale-90'
              : 'text-on-surface-variant active:bg-surface-variant'
          }`
        }
      >
        <span className="material-symbols-outlined text-[22px]">article</span>
        <span className="font-label-md text-[10px] mt-0.5">Posts</span>
      </NavLink>

      <NavLink
        to="/create"
        className="flex flex-col items-center justify-center text-on-surface-variant active:bg-surface-variant rounded-xl px-3 py-1 transition-all relative"
      >
        <div className="absolute -top-3 bg-primary text-on-primary rounded-full p-2 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
        </div>
        <span className="font-label-md text-[10px] mt-7">Create</span>
      </NavLink>

      <NavLink
        to="/calendar"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-all ${
            isActive
              ? 'text-secondary bg-secondary-container/20 scale-90'
              : 'text-on-surface-variant active:bg-surface-variant'
          }`
        }
      >
        <span className="material-symbols-outlined text-[22px]">calendar_month</span>
        <span className="font-label-md text-[10px] mt-0.5">Calendar</span>
      </NavLink>

      <NavLink
        to="/accounts"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-all ${
            isActive
              ? 'text-secondary bg-secondary-container/20 scale-90'
              : 'text-on-surface-variant active:bg-surface-variant'
          }`
        }
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
        <span className="font-label-md text-[10px] mt-0.5">More</span>
      </NavLink>
    </nav>
  );
}
