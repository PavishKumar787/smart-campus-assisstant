// src/components/Header.tsx
import React from "react";
import { Moon, Sun, GraduationCap, User } from "lucide-react";

export default function Header({
  darkMode,
  toggleDarkMode,
  onProfile,
}: {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onProfile?: () => void;
}) {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between
                       bg-slate-100 text-slate-900 shadow
                       dark:bg-slate-900 dark:text-slate-100">
      
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        <h1 className="text-xl font-semibold">Smart Campus Assistant</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded transition
                     bg-gray-100 text-gray-700
                     dark:bg-slate-700 dark:text-slate-200
                     hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-yellow-400" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Profile Button */}
        <button
          onClick={onProfile}
          className="flex items-center gap-2 p-2 rounded transition
                     bg-gray-50 text-slate-800
                     dark:bg-slate-700 dark:text-slate-100
                     hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <User className="h-5 w-5" />
          <span className="text-sm">Profile</span>
        </button>
      </div>
    </header>
  );
}
