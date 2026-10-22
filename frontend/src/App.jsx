import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import SosModal from './components/SosModal';

import LandingPage from './pages/LandingPage';
import HallDashboard from './pages/HallDashboard';
import PublicReport from './pages/PublicReport';
import StaffDashboard from './pages/StaffDashboard';
import GuestLifeline from './pages/GuestLifeline';
import FirstResponder from './pages/FirstResponder';
import AuthPage from './pages/AuthPage';
import MagicLogin from './pages/MagicLogin';

import venueApi from './api/venueApi';
import './index.css';

function AppContent({ isSosOpen, setIsSosOpen, venues }) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors flex flex-col">
      <Navbar onOpenSos={() => setIsSosOpen(true)} />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <Routes>
            {/* 1. Modern Clinical Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. 3D Public Triage Hall Dashboard (Open-Access, No Login) */}
            <Route path="/hall" element={<HallDashboard />} />

            {/* 3. Venue SOS Incident Reporting Portal */}
            <Route
              path="/report"
              element={<PublicReport onOpenSos={() => setIsSosOpen(true)} />}
            />

            {/* 4. Unified Staff Dashboard with RBAC (STAFF, DOCTOR, SECURITY) */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* 5. Live Guest Lifeline Tracker */}
            <Route path="/lifeline/:incidentId" element={<GuestLifeline />} />

            {/* 6. Tactical First Responder HUD */}
            <Route path="/responder/:responderToken" element={<FirstResponder />} />

            {/* 7. Passwordless MFA & Magic Link Auth */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<MagicLogin />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Global Rapid Emergency SOS Panic Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        venues={venues}
      />

      <ToastContainer
        position="bottom-right"
        autoClose={2500}
        limit={3}
        hideProgressBar={false}
        newestOnTop
        theme={theme}
      />
    </div>
  );
}

export default function App() {
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    venueApi.getVenues()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setVenues(res.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent
            isSosOpen={isSosOpen}
            setIsSosOpen={setIsSosOpen}
            venues={venues}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
