// src/components/Header.tsx
import React from "react";
import { Moon, Sun, GraduationCap, User } from "lucide-react";

export default function Header({ darkMode, toggleDarkMode, onProfile }: { darkMode: boolean; toggleDarkMode: ()=>void; onProfile?: ()=>void }) {
  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-blue-600" />
        <h1 className="text-xl font-semibold">Smart Campus Assistant</h1>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleDarkMode} className="p-2 rounded bg-gray-100">
          {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-600" />}
        </button>

        <button onClick={onProfile} className="flex items-center gap-2 p-2 rounded bg-gray-50">
          <User className="h-5 w-5" />
          <span className="text-sm">Profile</span>
        </button>
      </div>
    </header>
  );
}
