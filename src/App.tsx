/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, authStorage } from './api.ts';
import { SchoolSettings, AnyVoterSession, AdminSession, Candidate } from './types.ts';
import { StudentLoginView } from './components/StudentLoginView.tsx';
import { StudentDashboardView } from './components/StudentDashboardView.tsx';
import { StudentVotingRoom } from './components/StudentVotingRoom.tsx';
import { AdminLoginView } from './components/AdminLoginView.tsx';
import { AdminSidebar, AdminTab } from './components/AdminSidebar.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { AdminClassesView } from './components/AdminClassesView.tsx';
import { AdminStudentsView } from './components/AdminStudentsView.tsx';
import { AdminStaffView } from './components/AdminStaffView.tsx';
import { AdminCandidatesView } from './components/AdminCandidatesView.tsx';
import { AdminVoteResultsView } from './components/AdminVoteResultsView.tsx';
import { AdminSettingsView } from './components/AdminSettingsView.tsx';
import { AdminSecurityView } from './components/AdminSecurityView.tsx';
import { ElectionReportModal } from './components/ElectionReportModal.tsx';
import { QuickCountModal } from './components/QuickCountModal.tsx';
import { NetworkShareModal } from './components/NetworkShareModal.tsx';
import { GeminiChatbotModal } from './components/GeminiChatbotModal.tsx';
import { AudioVoiceTranscriberModal } from './components/AudioVoiceTranscriberModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { Menu, Vote, BarChart3, Bot, Sparkles, Mic, Wifi, QrCode } from 'lucide-react';

export default function App() {
  // Navigation State
  type AppView = 'student-login' | 'student-dashboard' | 'student-voting' | 'admin-login' | 'admin-panel';
  const [currentView, setCurrentView] = useState<AppView>('student-login');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // App Data & Session States
  const [settings, setSettings] = useState<SchoolSettings>({
    id: 'default',
    schoolName: 'SMP Negeri 2 Bogor',
    schoolAddress: 'Jl. Ir. H. Juanda No. 16, Pabaton, Bogor Tengah, Kota Bogor, Jawa Barat 16121',
    electionPeriod: '2026/2027',
    electionStatus: 'open',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&q=80&w=200',
    votingRules: 'Satu pemilih (siswa/guru/staff) berhak atas satu suara sah. Suara bersifat langsung, umum, bebas, rahasia, jujur, dan adil.'
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterSession, setVoterSession] = useState<AnyVoterSession | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  // Modals & Toasts
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isQuickCountOpen, setIsQuickCountOpen] = useState(false);
  const [isNetworkShareOpen, setIsNetworkShareOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load public config & check active sessions on mount
  useEffect(() => {
    // 1. Fetch public settings & candidates
    api.getPublicInfo()
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        if (data.candidates) setCandidates(data.candidates);
      })
      .catch((err) => console.error('Error fetching public info:', err));

    // 2. Check student token
    const studentToken = authStorage.getStudentToken();
    if (studentToken) {
      api.getStudentMe(studentToken)
        .then((res) => {
          if (res.success && res.student) {
            setVoterSession({ voterType: 'student', ...res.student });
            setCurrentView('student-dashboard');
          } else {
            authStorage.removeStudentToken();
          }
        })
        .catch(() => authStorage.removeStudentToken());
      return;
    }

    // 3. Check staff token
    const staffToken = authStorage.getStaffToken();
    if (staffToken) {
      api.getStaffMe(staffToken)
        .then((res) => {
          if (res.success && res.staff) {
            setVoterSession({ voterType: 'staff', ...res.staff });
            setCurrentView('student-dashboard');
          } else {
            authStorage.removeStaffToken();
          }
        })
        .catch(() => authStorage.removeStaffToken());
      return;
    }

    // 4. Check admin token
    const adminToken = authStorage.getAdminToken();
    if (adminToken) {
      api.getAdminMe(adminToken)
        .then((res) => {
          if (res.success && res.admin) {
            setAdminSession(res.admin);
          } else {
            authStorage.removeAdminToken();
          }
        })
        .catch(() => authStorage.removeAdminToken());
    }
  }, []);

  // -------------------------
  // Handlers for Voter Flow
  // -------------------------
  const handleVoterLoginSuccess = (voter: AnyVoterSession) => {
    setVoterSession(voter);
    setCurrentView('student-dashboard');
  };

  const handleVoterLogout = () => {
    authStorage.removeStudentToken();
    authStorage.removeStaffToken();
    setVoterSession(null);
    setCurrentView('student-login');
    addToast('info', 'Sesi pemilih telah diakhiri.');
  };

  const handleGoToVoting = () => {
    if (!voterSession) {
      setCurrentView('student-login');
      return;
    }
    if (voterSession.hasVoted) {
      addToast('info', 'Anda sudah menggunakan hak suara Anda.');
      return;
    }
    // Refresh candidates
    api.getPublicInfo().then((data) => {
      if (data.candidates) setCandidates(data.candidates);
    });
    setCurrentView('student-voting');
  };

  const handleVoteCompleted = () => {
    // Session is removed after 4-second delay
    setVoterSession(null);
    setCurrentView('student-login');
  };

  // -------------------------
  // Handlers for Admin Flow
  // -------------------------
  const handleAdminLoginSuccess = (admin: AdminSession) => {
    setAdminSession(admin);
    setCurrentView('admin-panel');
    setActiveAdminTab('dashboard');
  };

  const handleAdminLogout = () => {
    authStorage.removeAdminToken();
    setAdminSession(null);
    setCurrentView('admin-login');
    addToast('info', 'Berhasil keluar dari Panel Administrator.');
  };

  return (
    <div className="min-h-screen text-slate-800 antialiased font-sans flex flex-col">
      {/* VIEW: VOTER LOGIN (SISWA + GURU & STAFF) */}
      {currentView === 'student-login' && (
        <StudentLoginView
          settings={settings}
          onLoginSuccess={handleVoterLoginSuccess}
          onSwitchToAdmin={() => setCurrentView('admin-login')}
          onOpenQuickCount={() => setIsQuickCountOpen(true)}
          onShowToast={addToast}
          onOpenAI={() => setIsChatbotOpen(true)}
          onOpenNetworkShare={() => setIsNetworkShareOpen(true)}
        />
      )}

      {/* VIEW: VOTER DASHBOARD */}
      {currentView === 'student-dashboard' && voterSession && (
        <StudentDashboardView
          settings={settings}
          voter={voterSession}
          onGoToVoting={handleGoToVoting}
          onLogout={handleVoterLogout}
          onOpenQuickCount={() => setIsQuickCountOpen(true)}
        />
      )}

      {/* VIEW: VOTING ROOM */}
      {currentView === 'student-voting' && voterSession && (
        <StudentVotingRoom
          settings={settings}
          voter={voterSession}
          candidates={candidates}
          onBackToDashboard={() => setCurrentView('student-dashboard')}
          onVoteCompleted={handleVoteCompleted}
          onShowToast={addToast}
        />
      )}

      {/* VIEW: ADMIN LOGIN */}
      {currentView === 'admin-login' && (
        <AdminLoginView
          settings={settings}
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToStudent={() => setCurrentView('student-login')}
          onShowToast={addToast}
          onOpenAI={() => setIsChatbotOpen(true)}
        />
      )}

      {/* VIEW: ADMIN PANEL WITH SIDEBAR */}
      {currentView === 'admin-panel' && adminSession && (
        <div className="min-h-screen flex bg-slate-100">
          {/* Admin Sidebar */}
          <AdminSidebar
            settings={settings}
            admin={adminSession}
            activeTab={activeAdminTab}
            onSelectTab={(tab) => setActiveAdminTab(tab)}
            onLogout={handleAdminLogout}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onOpenNetworkShare={() => setIsNetworkShareOpen(true)}
          />

          {/* Admin Main Content Container */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Navbar */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Buka Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight font-heading">
                    {activeAdminTab === 'dashboard' && 'Beranda Statistik'}
                    {activeAdminTab === 'classes' && 'Data Kelas Rombel'}
                    {activeAdminTab === 'students' && 'Data Siswa & Hak Suara (DPT)'}
                    {activeAdminTab === 'staff' && 'Data Pemilih Guru & Staff (GTK)'}
                    {activeAdminTab === 'candidates' && 'Calon Kandidat OSIS'}
                    {activeAdminTab === 'results' && 'Perolehan Suara & Grafik'}
                    {activeAdminTab === 'settings' && 'Pengaturan Sistem'}
                    {activeAdminTab === 'security' && 'Keamanan & Kontrol Panitia'}
                  </h1>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {settings.schoolName} &bull; Periode {settings.electionPeriod}
                  </p>
                </div>
              </div>

              {/* Status & Quick Switch */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsNetworkShareOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  title="Buka QR Code & Akses Wi-Fi Lokal"
                >
                  <Wifi className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span className="hidden sm:inline">Akses Wi-Fi & QR</span>
                </button>

                <button
                  onClick={() => setIsQuickCountOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  title="Buka Quick Count Real-Time"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Quick Count</span>
                </button>

                <button
                  onClick={() => setCurrentView('student-login')}
                  className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
                  title="Lihat Bilik Suara"
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bilik Pemilih</span>
                </button>

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {adminSession.name.charAt(0)}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-800 leading-tight">{adminSession.name}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Administrator
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Admin Body Tab View */}
            <main className="p-4 sm:p-6 lg:p-8 flex-1">
              {activeAdminTab === 'dashboard' && (
                <AdminDashboardView
                  settings={settings}
                  onNavigateTab={(tab) => setActiveAdminTab(tab)}
                  onShowToast={addToast}
                  onOpenQuickCount={() => setIsQuickCountOpen(true)}
                  onOpenNetworkShare={() => setIsNetworkShareOpen(true)}
                />
              )}

              {activeAdminTab === 'classes' && (
                <AdminClassesView onShowToast={addToast} />
              )}

              {activeAdminTab === 'students' && (
                <AdminStudentsView onShowToast={addToast} />
              )}

              {activeAdminTab === 'staff' && (
                <AdminStaffView onShowToast={addToast} />
              )}

              {activeAdminTab === 'candidates' && (
                <AdminCandidatesView onShowToast={addToast} />
              )}

              {activeAdminTab === 'results' && (
                <AdminVoteResultsView
                  settings={settings}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  onShowToast={addToast}
                />
              )}

              {activeAdminTab === 'security' && <AdminSecurityView admin={adminSession} onShowToast={addToast} />}

              {activeAdminTab === 'settings' && (
                <AdminSettingsView
                  settings={settings}
                  admin={adminSession}
                  onSettingsUpdated={(newSet) => setSettings(newSet)}
                  onAdminUpdated={(newAdm) => setAdminSession(newAdm)}
                  onShowToast={addToast}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Official Election Report Modal */}
      <ElectionReportModal
        isOpen={isReportModalOpen}
        settings={settings}
        onClose={() => setIsReportModalOpen(false)}
        onSettingsUpdated={(newSet) => setSettings(newSet)}
        onShowToast={addToast}
      />

      {/* Real-Time Quick Count Modal */}
      <QuickCountModal
        isOpen={isQuickCountOpen}
        settings={settings}
        onClose={() => setIsQuickCountOpen(false)}
      />

      {/* Local Wi-Fi & Network Share Modal */}
      <NetworkShareModal
        isOpen={isNetworkShareOpen}
        settings={settings}
        onClose={() => setIsNetworkShareOpen(false)}
        onShowToast={addToast}
      />

      {/* Multi-turn Gemini AI Chatbot Modal */}
      <GeminiChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />

      {/* Audio Voice Transcriber Modal */}
      <AudioVoiceTranscriberModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onApplyText={(text) => {
          addToast('info', `Hasil transkripsi: "${text}"`);
        }}
      />

      {/* Floating Gemini AI Chatbot Launcher FAB */}
      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Buka Asisten Pintar eOSIS (Gemini 3.8 Flash)"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
        </div>
        <span className="font-heading tracking-wide">Tanya AI eOSIS</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Global Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
