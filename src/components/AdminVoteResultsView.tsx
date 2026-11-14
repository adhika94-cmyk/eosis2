import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { VoteResults, SchoolSettings } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import {
  BarChart3,
  Award,
  TrendingUp,
  RefreshCw,
  Printer,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  DoorClosed
} from 'lucide-react';

interface AdminVoteResultsViewProps {
  settings: SchoolSettings;
  onOpenReportModal: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminVoteResultsView: React.FC<AdminVoteResultsViewProps> = ({
  settings,
  onOpenReportModal,
  onShowToast
}) => {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset modal state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminResults();
      setResults(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat hasil perolehan suara.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleResetAllVotes = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetAllVotes();
      if (res.success) {
        onShowToast('success', res.message);
        setIsResetConfirmOpen(false);
        fetchResults();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset perolehan suara.');
    } finally {
      setIsResetting(false);
    }
  };

  // Sort candidates by votes to determine leader
  const sortedCandidates = results?.candidates
    ? [...results.candidates].sort((a, b) => b.votesCount - a.votesCount)
    : [];

  const maxVotes = sortedCandidates.length > 0 ? Math.max(...sortedCandidates.map((c) => c.votesCount), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Rekapitulasi Perolehan Suara
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Hasil penghitungan suara real-time Pemilihan OSIS {settings.schoolName} periode {settings.electionPeriod}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResults}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={onOpenReportModal}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Berita Acara</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset Seluruh Suara"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Suara</span>
          </button>
        </div>
      </div>

      {/* Top Banner: Total Suara & Partisipasi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-tr from-blue-700 to-indigo-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="text-xs uppercase font-bold text-blue-200 tracking-wider">Total Suara Masuk</div>
          <div className="text-3xl sm:text-4xl font-extrabold mt-1 font-heading">
            {results?.totalVotes || 0}
          </div>
          <p className="text-xs text-blue-100 mt-1">Surat suara sah tercatat di server</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Partisipasi Pemilih</div>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 mt-1 font-heading">
            {results?.participationPercentage || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {results?.totalVoted || results?.votedStudents || 0} dari {results?.totalVoters || results?.totalStudents || 0} pemilih (Siswa & Guru/Staff)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Integritas Pemilihan</div>
          <div className="flex items-center gap-2 mt-2 text-emerald-600 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Kerahasiaan Suara Terjamin</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sistem tidak menyimpan keterkaitan pemilih dengan kandidat pilihan.
          </p>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Grafik Visual Perolehan Suara</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi suara sah untuk masing-masing pasangan calon ketua dan wakil ketua OSIS.
            </p>
          </div>
        </div>

        {/* Custom High-Fidelity Animated Bar Chart */}
        <div className="space-y-6">
          {sortedCandidates.map((cand, index) => {
            const isLeader = index === 0 && cand.votesCount > 0;
            const percentageNum = Number(cand.percentage) || 0;
            const barWidthPercent = (cand.votesCount / maxVotes) * 100;

            return (
              <div key={cand.id} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center font-heading ${
                        isLeader
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      #{cand.candidateNo}
                    </span>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <span>{cand.leaderName} & {cand.viceLeaderName}</span>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <Award className="w-3 h-3 text-amber-600" />
                            Unggul Sementara
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 italic">"{cand.slogan}"</div>
                    </div>
                  </div>

                  <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span className="font-extrabold text-base text-slate-900 font-heading">
                      {cand.votesCount} Suara
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      {cand.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden p-0.5 flex">
                  <div
                    className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-bold text-white shadow-xs ${
                      isLeader
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    }`}
                    style={{ width: `${Math.max(5, barWidthPercent)}%` }}
                  >
                    {cand.votesCount > 0 && `${cand.percentage}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Detailed Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 font-heading">
            Tabel Rincian Perolehan Suara
          </h3>
          <span className="text-xs text-slate-500">
            Total Masuk: <strong>{results?.totalVotes || 0} suara</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No. Urut</th>
                <th className="px-6 py-4">Pasangan Calon Ketua & Wakil</th>
                <th className="px-6 py-4">Slogan</th>
                <th className="px-6 py-4 text-center">Perolehan Suara</th>
                <th className="px-6 py-4 text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {results?.candidates?.map((cand) => (
                <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs inline-flex items-center justify-center font-heading">
                      #{cand.candidateNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-900">{cand.leaderName}</div>
                    <div className="text-xs text-slate-500">& {cand.viceLeaderName}</div>
                  </td>
                  <td className="px-6 py-4 italic text-slate-600 text-xs">
                    "{cand.slogan}"
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-bold text-sm">
                      {cand.votesCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-extrabold text-blue-700 text-sm">
                      {cand.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right">Total Seluruh Suara Masuk:</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-blue-700">
                  {results?.totalVotes || 0} Suara
                </td>
                <td className="px-6 py-4 text-right text-sm">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Class Participation Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900 font-heading">
              Rekapitulasi Partisipasi per Kelas Rombel
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Nama Kelas</th>
                <th className="px-6 py-3.5 text-center">DPT (Total Siswa)</th>
                <th className="px-6 py-3.5 text-center">Sudah Memilih</th>
                <th className="px-6 py-3.5 text-right">Persentase Partisipasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {results?.classParticipation?.map((cls, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-900">Kelas {cls.className}</td>
                  <td className="px-6 py-3 text-center">{cls.total} siswa</td>
                  <td className="px-6 py-3 text-center font-semibold text-emerald-700">{cls.voted} siswa</td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-bold text-blue-700">{cls.percentage}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Konfirmasi Reset Seluruh Suara"
        message="PERINGATAN: Tindakan ini akan mengosongkan kembali seluruh perolehan suara kandidat menjadi 0 dan mengembalikan status seluruh siswa menjadi 'Belum Memilih'. Apakah Anda yakin?"
        confirmLabel="Ya, Kosongkan Suara"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isResetting}
        onConfirm={handleResetAllVotes}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
