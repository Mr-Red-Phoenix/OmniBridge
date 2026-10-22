import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sun,
  Moon01 as Moon,
  User01 as User,
  LogOut01 as LogOut,
} from '@untitledui/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Navbar({ onOpenSos }) {
  const { isAuthenticated, user, role, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-17 flex items-center justify-between">
        
        {/* Leftmost: OmniBridge Brand with Icon & Balanced Complementing Typography */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-4 text-decoration-none group">
            <img 
              src="/omnibridge-logo.png" 
              alt="OmniBridge" 
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col justify-center">
              <span className="text-[19px] sm:text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                OmniBridge
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.14em] uppercase mt-0.5">
                Clinical Triage 2.0
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Hall Board and Report Incident */}
        <nav className="flex items-center justify-center gap-3 sm:gap-6">
          <Link
            to="/hall"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
          >
            Hall Board
          </Link>

          <Link
            to="/report"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
          >
            Report Incident
          </Link>
        </nav>

        {/* Right-most: Theme Toggle Pill (Dribbble 10492788) + Staff Login */}
        <div className="flex-1 flex items-center justify-end gap-3.5">
          {/* Animated Light/Dark Pill Switch - Flawless 4px Margin Symmetry */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="relative flex items-center w-[68px] h-[36px] p-[4px] rounded-full bg-[#edf2f7] dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 shadow-inner cursor-pointer transition-colors duration-300 focus:outline-none select-none"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {/* Sliding Thumb Bubble (28px inside 36px height with 4px top/bottom/left padding) */}
            <span
              className={`absolute top-[4px] left-[4px] w-[28px] h-[28px] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm flex items-center justify-center z-0 ${
                isDark
                  ? 'translate-x-[32px] bg-[#2e3b4e] border border-slate-600/50'
                  : 'translate-x-0 bg-amber-400 border border-amber-300'
              }`}
            />

            {/* Left Slot: 30px width for Sun (Light Mode) */}
            <div className="relative z-10 w-[30px] h-[28px] flex items-center justify-center pointer-events-none">
              <Sun
                size={15}
                className={`transition-all duration-300 ${
                  !isDark
                    ? 'text-white stroke-[2.4]'
                    : 'text-slate-400 dark:text-slate-500 stroke-[2] opacity-60'
                }`}
              />
            </div>

            {/* Gap spacer: 2px */}
            <div className="w-[2px]" />

            {/* Right Slot: 30px width for Moon (Dark Mode) */}
            <div className="relative z-10 w-[30px] h-[28px] flex items-center justify-center pointer-events-none">
              <Moon
                size={14}
                className={`transition-all duration-300 ${
                  isDark
                    ? 'text-white stroke-[2.4]'
                    : 'text-slate-400 stroke-[2] opacity-60'
                }`}
              />
            </div>
          </button>

          {/* Emergency Broadcast Notification Bell */}
          <NotificationBell />

          {/* Rightmost: Staff Login / Auth Controls */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/staff"
                className="group flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 transition-all duration-200 shadow-xs hover:shadow-sm"
              >
                {/* User avatar/initial or icon with active pulse */}
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs">
                  <User size={13} className="stroke-[2.4]" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c121e]" />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Dashboard
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 tracking-wider uppercase leading-none mt-0.5">
                    {role === 'COORDINATOR' ? 'Coordinator (Doctor)' : role?.replace('ROLE_', '') || 'Staff'}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                className="w-8.5 h-8.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900/60 transition-all duration-200 cursor-pointer shadow-xs"
                title="Sign Out"
              >
                <LogOut size={14} className="stroke-[2.2]" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="rounded-xl px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs shadow-xs hover:shadow transition-all flex items-center gap-2"
            >
              <User size={15} />
              <span>Staff Login</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
