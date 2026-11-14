import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Trophy,
  Users,
  Activity,
  CheckCircle2,
  PieChart,
  School,
  Sparkles
} from 'lucide-react';
import { api } from '../api.ts';
import { QuickCountData, SchoolSettings } from '../types.ts';

interface QuickCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: SchoolSettings | null;
}

export const QuickCountModal: React.FC<QuickCountModalProps> = ({ isOpen, onClose, settings }) => {
  const [data, setData] = useState<QuickCountData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickCount = async (showSpin = true) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const res = await api.getQuickCount();
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load quick count:', err);
      setError(err?.message || 'Gagal memuat data quick count.');
    } finally {
      setLoading(false);
      if (showSpin) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchQuickCount(false);

    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchQuickCount(false);
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, autoRefresh]);

  if (!isOpen) return null;

  // Find leader candidate
  const sortedCandidates = data?.candidates
    ? [...data.candidates].sort((a, b) => b.votesCount - a.votesCount)
    : [];
  const leaderCandidateId =
    data && data.totalVotes > 0 && sortedCandidates.length > 0 && sortedCandidates[0].votesCount > 0
      ? sortedCandidates[0].id
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 flex items-center justify-center border border-white/20 shrink-0">
                <img
                  src={settings?.logoUrl || '/logo.png'}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <School className="w-6 h-6 text-cyan-300 hidden only:block" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/90 text-white shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    LIVE QUICK COUNT
                  </span>
                  <span className="text-xs text-indigo-200 hidden sm:inline">
                    Periode {settings?.electionPeriod || '2026/2027'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  Hasil Pemilihan Ketua & Wakil OSIS
                </h2>
                <p className="text-xs text-slate-300">
                  {settings?.schoolName || 'SMP Negeri 2 Bogor'} &bull; Tabulasi Suara Masuk Terverifikasi
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick bar control */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Status:{' '}
                <strong className="text-emerald-300 font-semibold uppercase">
                  {data?.electionStatus === 'open'
                    ? 'TPS Sedang Berjalan'
                    : data?.electionStatus === 'paused'
                    ? 'TPS Ditunda'
                    : 'Pemilihan Selesai'}
                </strong>
              </span>
              <span>&bull;</span>
              <span>
                Pembaruan: {data ? new Date(data.lastUpdated).toLocaleTimeString('id-ID') : '-'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-200 hover:text-white">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Auto-Refresh (4s)
              </label>

              <button
                onClick={() => fetchQuickCount(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white font-medium transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-300' : ''}`} />
                Segarkan
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">Menghubungkan ke server suara...</p>
            </div>
          ) : (
            <>
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Total Suara Masuk
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono">
                      {data?.totalVotes || 0}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">suara</span>
                  </div>
                  <span className="text-[11px] text-blue-500 mt-auto pt-1">
                    Dari {data?.totalVoters || 0} total DPT
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col">
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                    Partisipasi Pemilih
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                      {data?.participationRate || '0'}%
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${data?.participationRate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col">
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                    Partisipasi Siswa
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono">
                      {data?.votedStudents || 0}
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">/ {data?.totalStudents || 0}</span>
                  </div>
                  <span className="text-[11px] text-indigo-500 mt-auto pt-1">
                    {data?.totalStudents
                      ? ((data.votedStudents / data.totalStudents) * 100).toFixed(1)
                      : 0}
                    % telah memilih
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                    Partisipasi Guru & Staff
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
                      {data?.votedStaff || 0}
                    </span>
                    <span className="text-xs text-amber-700 font-medium">/ {data?.totalStaff || 0}</span>
                  </div>
                  <span className="text-[11px] text-amber-600 mt-auto pt-1">
                    {data?.totalStaff
                      ? ((data.votedStaff / data.totalStaff) * 100).toFixed(1)
                      : 0}
                    % telah memilih
                  </span>
                </div>
              </div>

              {/* Candidates Real-Time Standings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                    Perolehan Suara Calon Pasangan Kandidat
                  </h3>
                  <span className="text-xs text-slate-500">
                    Sistem Rahasia & Terenkripsi (LUBER JURDIL)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data?.candidates.map((cand) => {
                    const isLeader = cand.id === leaderCandidateId;
                    const percentNum = parseFloat(cand.percentage) || 0;

                    return (
                      <div
                        key={cand.id}
                        className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                          isLeader
                            ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300 shadow-md ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        {/* Winner / Leader Badge */}
                        {isLeader && (
                          <div className="absolute -top-3 right-4 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                            <Trophy className="w-3.5 h-3.5" />
                            Unggul Sementara
                          </div>
                        )}

                        <div>
                          {/* Top: Photo & Candidate No */}
                          <div className="flex items-center gap-3.5">
                            <div className="relative">
                              <img
                                src={cand.photoUrl || '/avatar-placeholder.png'}
                                alt={cand.leaderName}
                                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-xs"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face';
                                }}
                              />
                              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                                {cand.candidateNo}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                                Paslon No. {String(cand.candidateNo).padStart(2, '0')}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {cand.leaderName}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">
                                &amp; {cand.viceLeaderName}
                              </p>
                              <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
                                "{cand.slogan}"
                              </p>
                            </div>
                          </div>

                          {/* Big Percentage & Vote Count */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                            <div>
                              <span className="text-3xl font-black font-mono text-slate-900">
                                {cand.percentage}%
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold font-mono text-indigo-600">
                                {cand.votesCount}
                              </span>
                              <span className="text-xs text-slate-400 ml-1">suara</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isLeader
                                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600'
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              }`}
                              style={{ width: `${percentNum}%` }}
                            />
                          </div>
                        </div>

                        {/* Candidate Classes */}
                        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>
                            Kelas: {cand.leaderClass} &bull; {cand.viceLeaderClass}
                          </span>
                          {cand.votesCount > 0 && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Class Participation List (Collapsible / Compact) */}
              {data?.classParticipation && data.classParticipation.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Tingkat Kehadiran Pemilih per Kelas
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {data.classParticipation.map((cls) => (
                      <div
                        key={cls.className}
                        className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs text-center"
                      >
                        <span className="text-xs font-bold text-slate-800 block">{cls.className}</span>
                        <span className="text-xs font-mono font-semibold text-indigo-600 block mt-0.5">
                          {cls.voted}/{cls.total} ({cls.percentage}%)
                        </span>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${cls.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Hasil dihitung secara realtime dari database kriptografis terpusat.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
