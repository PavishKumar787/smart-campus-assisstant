// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import ChatBox from '../components/ChatBox'; // was ChatTabs - fixed

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleUploadSuccess = () => {
    setHasUploadedFiles(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main className="container mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col">
        {!hasUploadedFiles ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Upload your PDF documents to start asking questions
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <ChatBox />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
