import React from 'react';
import { SchoolSettings, AnyVoterSession } from '../types.ts';
import {
  Vote,
  CheckCircle2,
  XCircle,
  LogOut,
  User,
  Award,
  ShieldAlert,
  ArrowRight,
  Clock,
  Briefcase,
  GraduationCap,
  BarChart3
} from 'lucide-react';

interface StudentDashboardViewProps {
  settings: SchoolSettings;
  voter: AnyVoterSession;
  onGoToVoting: () => void;
  onLogout: () => void;
  onOpenQuickCount?: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  settings,
  voter,
  onGoToVoting,
  onLogout,
  onOpenQuickCount
}) => {
  const isStaff = voter.voterType === 'staff';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center p-1.5 shadow-xs">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Vote className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight font-heading">
                eOSIS {settings.schoolName}
              </div>
              <div className="text-xs text-slate-500">Periode Pemilihan {settings.electionPeriod}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenQuickCount && (
              <button
                onClick={onOpenQuickCount}
                className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition-all font-bold cursor-pointer shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
                <span>Quick Count</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {/* Card Banner */}
          <div
            className={`p-6 sm:p-8 text-white relative overflow-hidden ${
              isStaff
                ? 'bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800'
                : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800'
            }`}
          >
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md mb-2">
                  {isStaff ? <GraduationCap className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  {isStaff ? 'Pemilih Guru & Tenaga Kependidikan' : 'Biodata Pemilih Siswa'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
                  Halo, {isStaff ? `Bpk/Ibu ${voter.name}` : voter.name}
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">
                  Pastikan data identitas Anda di bawah ini sudah sesuai sebelum menggunakan hak suara.
                </p>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {voter.hasVoted ? (
                  <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg backdrop-blur-md">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-100">Status Hak Suara</div>
                      <div className="text-sm font-extrabold">Sudah Digunakan</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-400 text-slate-900 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg font-semibold">
                    <Clock className="w-5 h-5 text-slate-900" />
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700">Status Hak Suara</div>
                      <div className="text-sm font-extrabold">Belum Memilih</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voter Biodata Grid */}
          <div className="p-6 sm:p-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {isStaff ? 'Informasi Guru / Pegawai' : 'Informasi Siswa'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block mb-1">Nama Lengkap</span>
                <span className="text-sm font-bold text-slate-900 leading-snug">{voter.name}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block mb-1">
                  {isStaff ? 'NIP / ID Pegawai' : 'NISN'}
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {isStaff ? voter.nip : voter.nisn}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block mb-1">
                  {isStaff ? 'Jabatan / Tugas' : 'Kelas'}
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {isStaff ? voter.role : voter.className}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block mb-1">Status Partisipasi</span>
                {voter.hasVoted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Sudah Memilih
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Belum Memilih
                  </span>
                )}
              </div>
            </div>

            {/* Voting Action or Notice */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              {voter.hasVoted ? (
                <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-emerald-900">
                        Anda sudah menggunakan hak suara
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-800 mt-1 leading-relaxed">
                        Terima kasih atas partisipasi aktif Bapak/Ibu/Siswa dalam Pemilihan Ketua dan Wakil Ketua OSIS {settings.schoolName} periode {settings.electionPeriod}. Suara Anda telah tersimpan dengan aman dan rahasia.
                      </p>
                      {voter.votedAt && (
                        <div className="mt-2 text-[11px] text-emerald-700 font-mono">
                          Waktu pencatatan: {new Date(voter.votedAt).toLocaleString('id-ID')}
                        </div>
                      )}
                      {onOpenQuickCount && (
                        <div className="mt-4">
                          <button
                            onClick={onOpenQuickCount}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span>Lihat Quick Count Hasil Pemilihan Real-Time</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : settings.electionStatus !== 'open' ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Pemilihan Sedang Ditutup / Dijeda</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Panitia pemilihan sedang menjeda atau menutup akses bilik suara saat ini. Silakan hubungi panitia OSIS.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Hak Suara Anda Siap Digunakan
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
                      Klik tombol di samping untuk masuk ke bilik suara digital, membaca visi & misi calon ketua dan wakil ketua OSIS, serta memberikan 1 pilihan suara terbaik Anda.
                    </p>
                  </div>

                  <button
                    onClick={onGoToVoting}
                    className="shrink-0 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    <Vote className="w-5 h-5" />
                    <span>Berikan Suara</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voting Rules Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-slate-600 text-xs sm:text-sm shadow-xs">
          <div className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Tata Tertib Pemilihan eOSIS {settings.schoolName}:
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-slate-600">
            <li>Pemilih adalah siswa aktif, dewan guru, dan tenaga kependidikan terdaftar di {settings.schoolName}.</li>
            <li>Setiap pemilih hanya memiliki hak memberikan <strong>1 (satu) suara sah</strong>.</li>
            <li>Pilihan suara bersifat <strong>Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL)</strong>.</li>
            <li>Setelah memilih dan menekan konfirmasi, pilihan tersimpan permanen dan tidak dapat diganti.</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} {settings.schoolName}. eOSIS Digital Voting System.
      </footer>
    </div>
  );
};
