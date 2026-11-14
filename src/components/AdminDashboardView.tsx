import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { AdminStats, SchoolSettings } from '../types.ts';
import {
  Users,
  DoorClosed,
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Vote,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  BarChart3,
  Lightbulb,
  Wifi,
  QrCode
} from 'lucide-react';
import { CountdownTimer } from './CountdownTimer.tsx';

interface AdminDashboardViewProps {
  settings: SchoolSettings;
  onNavigateTab: (tab: any) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenQuickCount?: () => void;
  onOpenNetworkShare?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  settings,
  onNavigateTab,
  onShowToast,
  onOpenQuickCount,
  onOpenNetworkShare
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat statistik pemilihan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Beranda Statistik Pemilihan
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Ringkasan data langsung pemilih tetap, perolehan, dan partisipasi pemilih {settings.schoolName}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenNetworkShare && (
            <button
              onClick={onOpenNetworkShare}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
              <span>Akses Wi-Fi & QR</span>
            </button>
          )}

          {onOpenQuickCount && (
            <button
              onClick={onOpenQuickCount}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <BarChart3 className="w-4 h-4" />
              <span>Buka Quick Count Real-Time</span>
            </button>
          )}

          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Local Wi-Fi & Multi-device Access Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg border border-blue-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
            <Wifi className="w-6 h-6 animate-pulse text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm sm:text-base text-white font-heading">
                Akses Wi-Fi Lokal & Bilik Suara Siswa
              </h4>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Host 0.0.0.0:3000 Aktif
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Izinkan ratusan siswa & guru mencoblos serentak dari HP atau laptop masing-masing tanpa internet via Wi-Fi sekolah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenNetworkShare && (
            <button
              onClick={onOpenNetworkShare}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-blue-200" />
              <span>Tampilkan QR Code & Petunjuk HP</span>
            </button>
          )}
        </div>
      </div>

      {/* Lamp Workspace Status Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-50 border border-amber-300/40 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
            <Lightbulb className="w-5 h-5 fill-amber-400 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 font-heading flex items-center gap-2">
              <span>Ruang Kerja Admin & Lampu Operasional</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Sistem Terotentikasi
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Panel kendali terhubung dengan otentikasi Lamp Login interaktif & sinkronisasi data bilik suara real-time {settings.schoolName}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('results')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Rekapitulasi Suara</span>
          </button>
        </div>
      </div>

      {/* Countdown Timer Widget for Admin */}
      <CountdownTimer settings={settings} />

      {/* Main Stats Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Siswa */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">DPT Siswa</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-heading">
              {stats?.totalStudents || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats?.votedStudents !== undefined ? `${stats.votedStudents} sudah memilih` : 'Siswa Terdaftar'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Guru & Staff */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Guru & Staff</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1 font-heading">
              {stats?.totalStaff || 0}
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">
              {stats?.votedStaff !== undefined ? `${stats.votedStaff} sudah memilih` : 'Dewan Guru & TU'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Sudah Memilih (Total) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Suara Masuk</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 font-heading">
              {stats?.votedCount || 0}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              {stats?.participationRate || 0}% Partisipasi
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Belum Memilih (Total) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-wider">Belum Memilih</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1 font-heading">
              {stats?.notVotedCount || 0}
            </div>
            <div className="text-[11px] text-rose-600/80 mt-0.5">
              Total DPT: {(stats?.totalStudents || 0) + (stats?.totalStaff || 0)} pemilih
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Participation Rate Big Progress Bar Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Tingkat Partisipasi Pemilih eOSIS</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan suara yang telah masuk terhadap seluruh siswa terdaftar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-blue-600 font-heading">
              {stats?.participationRate || 0}%
            </span>
          </div>
        </div>

        {/* Animated Multi-Segment Progress Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 flex">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 shadow-xs"
            style={{ width: `${Math.min(100, stats?.participationRate || 0)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          <span>{stats?.votedCount || 0} dari {stats?.totalStudents || 0} siswa telah memberikan suara</span>
          <span className="font-semibold text-slate-700">Target Partisipasi: &gt; 90%</span>
        </div>
      </div>

      {/* Middle Two Columns: Quick Candidate Standings & Class Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Candidate Standings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Perolehan Suara Kandidat</span>
              </h3>
              <button
                onClick={() => onNavigateTab('results')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Lihat Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {stats?.candidateStats && stats.candidateStats.length > 0 ? (
                stats.candidateStats.map((cand) => (
                  <div key={cand.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                          #{cand.candidateNo}
                        </span>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900">
                            {cand.leaderName} & {cand.viceLeaderName}
                          </div>
                          <div className="text-[11px] text-slate-500 italic">"{cand.slogan}"</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-blue-700">{cand.votesCount} Suara</div>
                        <div className="text-[11px] text-slate-500">{cand.percentage}%</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${cand.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada data calon kandidat.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Terenkripsi & Asas Luber Jurdil
            </span>
            <span>Total Masuk: <strong>{stats?.totalVotesCast || 0} suara</strong></span>
          </div>
        </div>

        {/* Class Participation Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-indigo-600" />
                <span>Partisipasi per Kelas</span>
              </h3>
              <button
                onClick={() => onNavigateTab('students')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Kelola Siswa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {stats?.perClass && stats.perClass.length > 0 ? (
                stats.perClass.slice(0, 7).map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="font-bold text-slate-800 w-16">{cls.name}</div>
                    <div className="flex-1 mx-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>{cls.voted} dari {cls.total} siswa</span>
                        <span className="font-semibold text-slate-700">{cls.rate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cls.rate >= 80 ? 'bg-emerald-500' : cls.rate >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${cls.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada kelas terdaftar.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan kelas teratas</span>
            <button
              onClick={() => onNavigateTab('classes')}
              className="text-blue-600 hover:underline font-semibold"
            >
              Lihat Seluruh {stats?.totalClasses || 0} Kelas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
