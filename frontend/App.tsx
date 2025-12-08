// App.tsx
import React from "react";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./src/pages/Home";
import NotFound from "./src/pages/NotFound";
import Login from "./src/pages/Login";
import Register from "./src/pages/Register";

const App: React.FC = () => {
  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <Router>
        <main className="min-h-screen font-inter">
          <Routes>
            {/* Login as default */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Page after login */}
            <Route path="/home" element={<Home />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
            className="mt-16"
          />
        </main>
      </Router>
    </Theme>
  );
};

export default App;
