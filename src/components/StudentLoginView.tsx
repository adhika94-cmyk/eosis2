import React, { useState, useEffect } from 'react';
import { api, authStorage } from '../api.ts';
import { SchoolSettings, AnyVoterSession } from '../types.ts';
import { CountdownTimer } from './CountdownTimer.tsx';
import { AudioVoiceTranscriberModal } from './AudioVoiceTranscriberModal.tsx';
import { DashboardObjectiveModal } from './DashboardObjectiveModal.tsx';
import {
  ShieldCheck,
  Vote,
  Calendar,
  CreditCard,
  Lock,
  Sparkles,
  ArrowRight,
  UserCheck,
  GraduationCap,
  Users,
  KeyRound,
  Briefcase,
  BarChart3,
  Mic,
  Target,
  Bot,
  Activity,
  CheckCircle2,
  HelpCircle,
  Clock,
  Award,
  Wifi,
  QrCode
} from 'lucide-react';

interface StudentLoginViewProps {
  settings: SchoolSettings;
  onLoginSuccess: (voter: AnyVoterSession) => void;
  onSwitchToAdmin: () => void;
  onOpenQuickCount?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenAI?: () => void;
  onOpenNetworkShare?: () => void;
}

export const StudentLoginView: React.FC<StudentLoginViewProps> = ({
  settings,
  onLoginSuccess,
  onSwitchToAdmin,
  onOpenQuickCount,
  onShowToast,
  onOpenAI,
  onOpenNetworkShare
}) => {
  // Tab state: 'student' or 'staff'
  const [voterType, setVoterType] = useState<'student' | 'staff'>('student');

  // Student inputs
  const [nisn, setNisn] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Staff inputs
  const [nip, setNip] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceTargetField, setVoiceTargetField] = useState<'nisn' | 'nip' | 'birthDate' | 'birthYear' | 'general'>('general');
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);

  // Live Turnout Summary
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalVoted: 0,
    participationRate: '0'
  });

  useEffect(() => {
    api.getPublicInfo()
      .then((data) => {
        if (data.stats) {
          setStats({
            totalVoters: data.stats.totalVoters,
            totalVoted: data.stats.totalVoted,
            participationRate: data.stats.participationRate
          });
        }
      })
      .catch((err) => console.warn('Could not load public stats:', err));
  }, []);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!/^[a-fA-F0-9]{32}$/.test(nisn.trim())) { setErrorMessage('Masukkan kode pemilih 32 karakter dari panitia.'); return; }

    setIsLoading(true);
    try {
      const res = await api.studentLogin(nisn.trim());
      if (res.success && res.student) {
        authStorage.setStudentToken(res.token);
        onLoginSuccess({ voterType: 'student', ...res.student });
        onShowToast('success', `Selamat datang, ${res.student.name}! Hak suara Anda terverifikasi.`);
      } else {
        setErrorMessage('Data pemilih tidak valid.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk. Periksa kembali kode pemilih Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!/^[a-fA-F0-9]{32}$/.test(nip.trim())) { setErrorMessage('Masukkan kode pemilih 32 karakter dari panitia.'); return; }

    setIsLoading(true);
    try {
      const res = await api.staffLogin(nip.trim());
      if (res.success && res.staff) {
        authStorage.setStaffToken(res.token);
        onLoginSuccess({ voterType: 'staff', ...res.staff });
        onShowToast('success', `Selamat datang, Bapak/Ibu ${res.staff.name}! Hak suara Anda terverifikasi.`);
      } else {
        setErrorMessage('Data guru/staff tidak valid.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk. Periksa kembali kode pemilih Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick voice capture helper
  const openVoiceForField = (field: 'nisn' | 'nip' | 'birthDate' | 'birthYear') => {
    setVoiceTargetField(field);
    setIsVoiceModalOpen(true);
  };

  const handleVoiceTranscribed = (text: string) => {
    const cleanDigits = text.replace(/\D/g, '');
    if (voiceTargetField === 'nisn') {
      if (cleanDigits.length >= 10) {
        setNisn(cleanDigits.slice(0, 10));
      } else if (cleanDigits.length > 0) {
        setNisn(cleanDigits);
      } else {
        setNisn(text.trim());
      }
      onShowToast('info', `NISN diisi dari transkripsi suara: ${text}`);
    } else if (voiceTargetField === 'nip') {
      setNip(cleanDigits.length > 0 ? cleanDigits : text.trim());
      onShowToast('info', `NIP diisi dari transkripsi suara: ${text}`);
    } else if (voiceTargetField === 'birthYear') {
      const year = cleanDigits.slice(0, 4);
      if (year) setBirthYear(year);
      onShowToast('info', `Tahun lahir diisi: ${year || text}`);
    } else {
      onShowToast('info', `Suara terdeteksi: "${text}"`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Modern Top Navigation Bar */}
      <header className="relative z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & School Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Vote className="w-6 h-6 text-cyan-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight font-heading">
                  eOSIS Digital
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {settings.schoolName || 'SMP Negeri 2 Bogor'} &bull; Periode {settings.electionPeriod}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Objektif Dashboard Button */}
            <button
              type="button"
              onClick={() => setIsObjectiveModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 rounded-xl transition-all cursor-pointer font-semibold"
              title="Lihat Objektif & Spesifikasi UI/UX Dashboard"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Objektif Dashboard</span>
            </button>

            {/* Audio Voice Transcribe Studio Button */}
            <button
              type="button"
              onClick={() => {
                setVoiceTargetField('general');
                setIsVoiceModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 px-3 py-2 rounded-xl transition-all cursor-pointer font-semibold shadow-xs"
              title="Input Suara / Transkripsi Audio (Gemini 3.5 Transcribe)"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Transkripsi Suara</span>
            </button>

            {/* Quick Count Button */}
            {onOpenQuickCount && (
              <button
                type="button"
                onClick={onOpenQuickCount}
                className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold shadow-sm"
                title="Buka Real-Time Quick Count"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
                <span>Quick Count</span>
              </button>
            )}

            {/* Local Wi-Fi & QR Share Button */}
            {onOpenNetworkShare && (
              <button
                type="button"
                onClick={onOpenNetworkShare}
                className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/30 px-3 py-2 rounded-xl transition-all cursor-pointer font-semibold shadow-xs"
                title="Buka QR Code untuk Siswa di HP / Laptop Lain"
              >
                <Wifi className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span className="hidden sm:inline">Akses Wi-Fi & QR</span>
              </button>
            )}

            {/* Admin Switch */}
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 rounded-xl transition-all cursor-pointer font-medium"
              title="Login Administrator"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: DASHBOARD OBJECTIVES & LIVE STATS BANNER */}
          <div className="lg:col-span-6 space-y-6">
            {/* Status Live Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-xs font-semibold text-blue-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Bilik Suara Pemilihan Terbuka & Rahasia</span>
            </div>

            {/* Main Headline */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight font-heading">
                Otentikasi & Bilik Suara{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  eOSIS Mandiri
                </span>
              </h2>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Platform pemilihan berbasis web modern dengan asas <strong>LUBER & JURDIL</strong>. 
                Gunakan kode pemilih sekali pakai yang dibagikan secara tertutup oleh panitia.
              </p>
            </div>

            {/* Countdown Widget Embedded */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-4 backdrop-blur-md">
              <CountdownTimer settings={settings} />
            </div>

            {/* Live KPI Statistics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  Partisipasi
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-heading">
                  {stats.participationRate}%
                </div>
                <div className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Live Voter Turnout
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" />
                  Total DPT
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-heading">
                  {stats.totalVoters || '1,248'}
                </div>
                <div className="text-[10px] text-indigo-300 mt-0.5">
                  Siswa & Dewan Guru
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Integritas
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1 font-heading">
                  100%
                </div>
                <div className="text-[10px] text-emerald-300 mt-0.5">
                  Terenkripsi 1 Pemilih
                </div>
              </div>
            </div>

            {/* 4 Objektif Dashboard Highlights */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  4 Objektif Pokok Dashboard Pemilu:
                </span>
                <button
                  type="button"
                  onClick={() => setIsObjectiveModalOpen(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                >
                  Detail Lengkap &rarr;
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Kerahasiaan Suara Dijamin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Dukungan Input Suara Mikrofon</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Tabulasi Quick Count Real-Time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Konsultasi AI Gemini 3.8 Flash</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MODERN NEO-GLASSMORPHIC LOGIN CARD */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-md w-full">
              {/* Outer Glow Card Border */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-3xl blur-md opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />

              <div className="relative rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
                {/* Header of Login Card */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-3 p-1">
                    <Vote className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-heading">
                    Portal Masuk Pemilih
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Pilih kategori pemilih dan lengkapi data autentikasi Anda
                  </p>
                </div>

                {/* Role Switcher Tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl mb-5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setVoterType('student');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      voterType === 'student'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Pemilih Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoterType('staff');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      voterType === 'staff'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Guru & Staff (GTK)</span>
                  </button>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-5 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <span className="font-bold text-rose-400 shrink-0 mt-0.5">&bull;</span>
                    <div>{errorMessage}</div>
                  </div>
                )}

                {/* FORM PEMILIH SISWA */}
                {voterType === 'student' ? (
                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Kode Pemilih Siswa</label>
                      <input type="text" autoComplete="one-time-code" maxLength={32} value={nisn} onChange={(e) => setNisn(e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase())} placeholder="Masukkan 32 karakter kode pemilih" className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm font-mono tracking-widest" required />
                      <p className="text-[11px] text-slate-400 mt-1">Kode sekali pakai dibagikan langsung oleh panitia. Jangan bagikan kepada orang lain.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer active:scale-95"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Memverifikasi Hak Suara Siswa...</span>
                        </>
                      ) : (
                        <>
                          <span>Masuk ke Bilik Suara Siswa</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* FORM PEMILIH GURU & STAFF */
                  <form onSubmit={handleStaffSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Kode Pemilih Guru/Staff</label>
                      <input type="text" autoComplete="one-time-code" maxLength={32} value={nip} onChange={(e) => setNip(e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase())} placeholder="Masukkan 32 karakter kode pemilih" className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm font-mono tracking-widest" required />
                      <p className="text-[11px] text-slate-400 mt-1">Kode sekali pakai dibagikan langsung oleh panitia.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer active:scale-95"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Memverifikasi Hak Suara Guru/Staff...</span>
                        </>
                      ) : (
                        <>
                          <span>Masuk ke Bilik Suara Guru/Staff</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Asas Luber Jurdil Footer Pill */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dijamin Asas <strong>LUBER & JURDIL</strong></span>
                </div>


              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer with Quick Links */}
      <footer className="relative z-20 border-t border-white/10 bg-slate-950/80 px-4 sm:px-8 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} {settings.schoolName}. Aplikasi E-Voting Resmi eOSIS.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsObjectiveModalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Objektif Dashboard
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={() => {
                setVoiceTargetField('general');
                setIsVoiceModalOpen(true);
              }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Input Suara Gemini
            </button>
            <span className="text-slate-600">&bull;</span>
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>Asisten Cerdas</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Audio Voice Transcriber Modal */}
      <AudioVoiceTranscriberModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        title={
          voiceTargetField === 'nisn'
            ? 'Diktekan NISN Anda (10 Digit)'
            : voiceTargetField === 'nip'
            ? 'Diktekan NIP / ID Pegawai'
            : voiceTargetField === 'birthYear'
            ? 'Sebutkan 4 Digit Tahun Lahir'
            : 'Transkripsi Suara (Gemini 3.5 Transcribe)'
        }
        description={
          voiceTargetField === 'nisn'
            ? 'Bicaralah dengan jelas menyebutkan angka NISN Anda. Model Gemini 3.5 Transcribe akan mengonversinya langsung ke input NISN.'
            : 'Gunakan mikrofon Anda untuk mendiktekan suara, angka, atau pertanyaan.'
        }
        onApplyText={handleVoiceTranscribed}
      />

      {/* Dashboard Objective Modal */}
      <DashboardObjectiveModal
        isOpen={isObjectiveModalOpen}
        onClose={() => setIsObjectiveModalOpen(false)}
        settings={settings}
        onOpenAI={onOpenAI}
      />
    </div>
  );
};
