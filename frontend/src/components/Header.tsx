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
    <header
      className="w-full px-6 py-4 flex items-center justify-between rounded-2xl
                 bg-white/5 backdrop-blur-xl border border-white/10
                 text-purple-50 shadow-[0_12px_35px_rgba(0,0,0,0.6)]"
    >
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-pink-300" />
        <h1 className="text-lg md:text-xl font-semibold tracking-wide">
          Smart Campus Assistant
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full transition
                     bg-white/10 border border-white/20
                     text-purple-100 hover:bg-white/20"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-yellow-300" />
          ) : (
            <Moon className="h-5 w-5 text-purple-100" />
          )}
        </button>

        {/* Profile Button */}
        <button
          onClick={onProfile}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition
                     bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500
                     text-white shadow-[0_8px_25px_rgba(236,72,153,0.45)]
                     hover:brightness-110"
        >
          <User className="h-4 w-4" />
          Profile
        </button>
      </div>
    </header>
  );
}
