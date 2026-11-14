import React from 'react';
import {
  Target,
  ShieldCheck,
  Zap,
  Users,
  BarChart3,
  Mic,
  Award,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { SchoolSettings } from '../types.ts';

interface DashboardObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  onOpenAI?: () => void;
}

export const DashboardObjectiveModal: React.FC<DashboardObjectiveModalProps> = ({
  isOpen,
  onClose,
  settings,
  onOpenAI
}) => {
  if (!isOpen) return null;

  const pillars = [
    {
      icon: Target,
      color: 'from-blue-500 to-indigo-600',
      title: '1. Objektif & Sasaran Utama Dashboard',
      description:
        'Menyediakan gerbang tunggal (Single Portal) pemilihan ketua & wakil ketua OSIS yang menjamin suara sah setiap siswa dan guru terhitung secara presisi, real-time, dan tanpa kecurangan.',
      kpis: [
        'Tingkat Partisipasi (Turnout Rate) > 90% DPT sekolah',
        'Tabulasi suara instan tanpa waktu tunda (Real-Time Quick Count)',
        'Zero Invalid Ballots (0% surat suara rusak akibat human error)'
      ]
    },
    {
      icon: Layers,
      color: 'from-cyan-500 to-blue-600',
      title: '2. Prinsip Arsitektur UI/UX Dashboard',
      description:
        'Pendekatan Human-Centered Design dengan pemisahan peran yang tegas (Role-Based Authentication) antara Pemilih Siswa, Guru & Staff (GTK), dan Administrator.',
      kpis: [
        'Hierarki Visual Jelas: Fokus login cepat tanpa distraksi',
        'Aksesibilitas Universal: Dukungan Mikrofon Voice-to-Text untuk disabilitas dan kemudahan input',
        'Feedback Interaktif Cepat: Validasi real-time NISN 10 digit & format NIP/Tahun lahir'
      ]
    },
    {
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-600',
      title: '3. Asas LUBER & JURDIL Berbasis Digital',
      description:
        'Mengamankan hak pilih dengan sistem token sesi terenkripsi dan mekanisme one-time voting token sehingga tidak ada pemilih yang dapat mencoblos ganda.',
      kpis: [
        'Langsung & Rahasia: Pilihan kandidat tidak dapat dilacak kembali ke identitas pemilih',
        'Jujur & Adil: Status pemilih otomatis berubah ke "Sudah Memilih" setelah submit',
        'Audit Trail Lengkap: Rekapitulasi per kelas dan berita acara resmi siap cetak'
      ]
    },
    {
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      title: '4. Inovasi Cerdas & Teknologi Generatif',
      description:
        'Penerapan integrasi Gemini 3.5 Transcribe untuk transkripsi audio mikrofon dan Gemini 3.8 Flash untuk chatbot konsultasi cerdas sepanjang pemilu.',
      kpis: [
        'Gemini 3.5 Transcribe: Dikte suara instan langsung diinput',
        'Gemini 3.8 Flash & 3.1 Flash Lite: Tanya jawab multi-turn edukatif',
        'Desain Neo-Glassmorphic Modern: Tipografi modern Space Grotesk & Plus Jakarta Sans'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white font-heading">
                  Objektif & Spesifikasi UI/UX Dashboard
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  Desain Sistem
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings.schoolName} &bull; Periode Pemilihan {settings.electionPeriod}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Summary Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-blue-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Visi Dashboard Login eOSIS
              </h4>
              <p className="text-xs text-slate-300">
                Membangun pengalaman otentikasi dan pemungutan suara digital yang menyenangkan, inklusif, terpercaya, dan mematuhi asas demokrasi sekolah modern.
              </p>
            </div>
            {onOpenAI && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAI();
                }}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tanya Pakar AI</span>
              </button>
            )}
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${pillar.color} text-white flex items-center justify-center shrink-0 shadow-md`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-sm text-slate-100 font-heading">
                        {pillar.title}
                      </h5>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Target & Indikator Pencapaian (KPI):
                    </span>
                    {pillar.kpis.map((kpi, kIdx) => (
                      <div
                        key={kIdx}
                        className="flex items-start gap-2 text-[11px] text-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{kpi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Journey Flow */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Alur Pengguna (User Journey Map)</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-blue-400 font-bold block">Tahap 1</span>
                <strong className="text-white">Identifikasi Role</strong>
                <p className="text-[11px] text-slate-400 mt-1">Pilih tab Siswa, Guru & Staff, atau Admin.</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-bold block">Tahap 2</span>
                <strong className="text-white">Input / Suara Mic</strong>
                <p className="text-[11px] text-slate-400 mt-1">Ketik atau diktekan NISN / NIP via mikrofon.</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-indigo-400 font-bold block">Tahap 3</span>
                <strong className="text-white">Validasi DPT</strong>
                <p className="text-[11px] text-slate-400 mt-1">Sistem memeriksa kecocokan data & hak suara.</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold block">Tahap 4</span>
                <strong className="text-white">Bilik Suara Rahasia</strong>
                <p className="text-[11px] text-slate-400 mt-1">Pilih paslon & konfirmasi suara terenkripsi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Standar Kualitas UI/UX: ISO 9241-210 Human-Centered Design</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
