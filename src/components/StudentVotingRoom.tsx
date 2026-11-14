import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { api, authStorage } from '../api.ts';
import { SchoolSettings, Candidate, AnyVoterSession } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import { Vote, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Quote, Sparkles } from 'lucide-react';

interface StudentVotingRoomProps {
  settings: SchoolSettings;
  voter: AnyVoterSession;
  candidates: Candidate[];
  onBackToDashboard: () => void;
  onVoteCompleted: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const StudentVotingRoom: React.FC<StudentVotingRoomProps> = ({
  settings,
  voter,
  candidates,
  onBackToDashboard,
  onVoteCompleted,
  onShowToast
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state for 4-second display
  const [hasVotedSuccess, setHasVotedSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Expanded vision/mission accordion states
  const [expandedCandId, setExpandedCandId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCandId(expandedCandId === id ? null : id);
  };

  const handleOpenConfirm = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsConfirmOpen(true);
  };

  const executeVote = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    try {
      const res =
        voter.voterType === 'staff'
          ? await api.castStaffVote(selectedCandidate.id)
          : await api.castVote(selectedCandidate.id);

      if (res.success) {
        setIsConfirmOpen(false);
        setHasVotedSuccess(true);

        // Fire celebratory confetti!
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // Ignore if canvas-confetti unsupported
        }

        // 4-second countdown before clearing session and returning to student login
        let remaining = 4;
        setCountdown(remaining);

        const interval = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(interval);
            authStorage.removeStudentToken();
            authStorage.removeStaffToken();
            onVoteCompleted();
          }
        }, 1000);
      }
    } catch (err: any) {
      setIsConfirmOpen(false);
      onShowToast('error', err.message || 'Gagal menyimpan suara.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN (Required 4 seconds)
  if (hasVotedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-blue-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 text-center shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading leading-snug">
            Suara Anda berhasil dicatat, terima kasih telah berpartisipasi
          </h2>

          <p className="text-slate-600 text-sm mt-3 leading-relaxed">
            Pilihan Anda telah dihitung secara aman dan rahasia untuk Pemilihan OSIS {settings.schoolName}. Sesi pemilih Anda akan segera diakhiri.
          </p>

          {/* 4-second Countdown bar */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Mengalihkan ke halaman utama</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">{countdown} detik...</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight font-heading flex items-center gap-2">
                <span>Bilik Suara Digital</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {settings.electionPeriod}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {voter.voterType === 'staff'
                  ? `Pemilih: ${voter.name} (NIP: ${voter.nip})`
                  : `Pemilih: ${voter.name} (${voter.className})`}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pilih 1 Pasangan Calon Terbaik</span>
          </div>
        </div>
      </header>

      {/* Main Candidate Grid */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
            Surat Suara Elektronik
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Daftar Calon Ketua & Wakil Ketua OSIS
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Pelajari visi, misi, dan slogan setiap pasangan calon di bawah ini. Tekan tombol <strong>"Pilih Pasangan Ini"</strong> untuk menentukan pilihan Anda.
          </p>
        </div>

        {/* Candidate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => {
            const isExpanded = expandedCandId === cand.id;

            return (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:border-blue-300"
              >
                {/* Photo & Number Header */}
                <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={cand.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600'}
                    alt={`Paslon ${cand.candidateNo}`}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/20" />

                  {/* Candidate Number Badge */}
                  <div className="absolute top-4 left-4 w-12 h-12 rounded-2xl bg-blue-600/90 backdrop-blur-md text-white font-extrabold text-xl flex items-center justify-center shadow-lg border border-white/30 font-heading">
                    #{cand.candidateNo}
                  </div>

                  {/* Candidate Names overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-xs text-blue-200 font-medium">Calon Ketua & Wakil Ketua</div>
                    <h3 className="font-extrabold text-lg leading-snug drop-shadow-sm font-heading">
                      {cand.leaderName}
                    </h3>
                    <div className="text-sm font-semibold text-slate-200 drop-shadow-sm flex items-center gap-1">
                      <span>& {cand.viceLeaderName}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Class Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        Ketua: {cand.leaderClass}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        Wakil: {cand.viceLeaderClass}
                      </span>
                    </div>

                    {/* Slogan */}
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs italic mb-4 flex items-start gap-2">
                      <Quote className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="font-medium">"{cand.slogan}"</span>
                    </div>

                    {/* Visi */}
                    <div className="mb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Visi:
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {cand.vision}
                      </p>
                    </div>

                    {/* Misi Accordion */}
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cand.id)}
                        className="w-full flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-800 py-1.5 cursor-pointer"
                      >
                        <span>Lihat Misi Calon ({cand.mission?.length || 0} Poin)</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5 animate-in fade-in">
                          {cand.mission && cand.mission.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="font-bold text-blue-600 shrink-0">{idx + 1}.</span>
                              <span className="leading-relaxed">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pick Candidate Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(cand)}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 hover:scale-[1.01]"
                  >
                    <Vote className="w-5 h-5" />
                    <span>Pilih Pasangan #{cand.candidateNo}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Pilihan Suara Anda"
        message="Pastikan Anda telah memeriksa dengan teliti. Setelah disimpan, suara Anda tidak dapat dibatalkan atau diubah."
        confirmLabel="Ya, Simpan Suara Saya"
        cancelLabel="Batal / Pilih Ulang"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={executeVote}
        onCancel={() => setIsConfirmOpen(false)}
      >
        {selectedCandidate && (
          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                #{selectedCandidate.candidateNo}
              </span>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {selectedCandidate.leaderName} & {selectedCandidate.viceLeaderName}
                </div>
                <div className="text-xs text-blue-700 italic">"{selectedCandidate.slogan}"</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-blue-200/60">
              Hak suara pemilih:{' '}
              <strong>{voter.name}</strong>{' '}
              ({voter.voterType === 'staff' ? `NIP: ${voter.nip} - ${voter.role}` : voter.className})
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} {settings.schoolName}. Bilik Suara Elektronik Terenkripsi.
      </footer>
    </div>
  );
};
