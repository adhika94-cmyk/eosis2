import React, { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { SchoolSettings, VoteResults } from '../types.ts';
import {
  Printer,
  X,
  Award,
  FileText,
  UserCheck,
  GraduationCap,
  Briefcase,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles
} from 'lucide-react';

interface ElectionReportModalProps {
  isOpen: boolean;
  settings: SchoolSettings;
  onClose: () => void;
  onSettingsUpdated?: (newSettings: SchoolSettings) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ElectionReportModal: React.FC<ElectionReportModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSettingsUpdated,
  onShowToast
}) => {
  const [results, setResults] = useState<VoteResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Manual input fields for signatories & letter number
  const [committeeChairmanName, setCommitteeChairmanName] = useState(
    settings.committeeChairmanName || 'Muhammad Rizky Pratama'
  );
  const [committeeChairmanId, setCommitteeChairmanId] = useState(
    settings.committeeChairmanId || 'NISN. 0089218291'
  );

  const [osisAdvisorName, setOsisAdvisorName] = useState(
    settings.osisAdvisorName || 'Hendra Gunawan, S.Pd.'
  );
  const [osisAdvisorNip, setOsisAdvisorNip] = useState(
    settings.osisAdvisorNip || 'NIP. 198503152010011012'
  );

  const [headmasterName, setHeadmasterName] = useState(
    settings.headmasterName || 'Dra. Hj. Sri Wahyuni, M.Pd.'
  );
  const [headmasterNip, setHeadmasterNip] = useState(
    settings.headmasterNip || 'NIP. 197405201998021001'
  );

  const [reportLetterNumber, setReportLetterNumber] = useState(
    settings.reportLetterNumber || `042/PPO-OSIS/SMPN2/${new Date().getFullYear()}`
  );

  const defaultFormattedDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full'
  }).format(new Date());

  const [reportDate, setReportDate] = useState(settings.reportDate || defaultFormattedDate);

  // Toggle editor panel visibility
  const [isEditorOpen, setIsEditorOpen] = useState(true);

  // Sync when settings change
  useEffect(() => {
    if (settings) {
      if (settings.committeeChairmanName) setCommitteeChairmanName(settings.committeeChairmanName);
      if (settings.committeeChairmanId) setCommitteeChairmanId(settings.committeeChairmanId);
      if (settings.osisAdvisorName) setOsisAdvisorName(settings.osisAdvisorName);
      if (settings.osisAdvisorNip) setOsisAdvisorNip(settings.osisAdvisorNip);
      if (settings.headmasterName) setHeadmasterName(settings.headmasterName);
      if (settings.headmasterNip) setHeadmasterNip(settings.headmasterNip);
      if (settings.reportLetterNumber) setReportLetterNumber(settings.reportLetterNumber);
      if (settings.reportDate) setReportDate(settings.reportDate);
    }
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      api.getAdminResults()
        .then((data) => setResults(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSignatories = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateAdminSettings({
        committeeChairmanName: committeeChairmanName.trim(),
        committeeChairmanId: committeeChairmanId.trim(),
        osisAdvisorName: osisAdvisorName.trim(),
        osisAdvisorNip: osisAdvisorNip.trim(),
        headmasterName: headmasterName.trim(),
        headmasterNip: headmasterNip.trim(),
        reportLetterNumber: reportLetterNumber.trim(),
        reportDate: reportDate.trim()
      });

      if (res.success && res.settings) {
        if (onSettingsUpdated) onSettingsUpdated(res.settings);
        if (onShowToast) {
          onShowToast('success', 'Data penandatangan Berita Acara berhasil disimpan ke pengaturan sistem!');
        }
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', err.message || 'Gagal menyimpan data penandatangan.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setCommitteeChairmanName('Muhammad Rizky Pratama');
    setCommitteeChairmanId('NISN. 0089218291');
    setOsisAdvisorName('Hendra Gunawan, S.Pd.');
    setOsisAdvisorNip('NIP. 198503152010011012');
    setHeadmasterName('Dra. Hj. Sri Wahyuni, M.Pd.');
    setHeadmasterNip('NIP. 197405201998021001');
    setReportLetterNumber(`042/PPO-OSIS/SMPN2/${new Date().getFullYear()}`);
    setReportDate(defaultFormattedDate);
    if (onShowToast) {
      onShowToast('info', 'Mengembalikan penandatangan ke contoh awal.');
    }
  };

  const sortedCandidates = results?.candidates
    ? [...results.candidates].sort((a, b) => b.votesCount - a.votesCount)
    : [];

  const winner = sortedCandidates.length > 0 ? sortedCandidates[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-in fade-in overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl border border-slate-200 my-8 print:shadow-none print:border-none print:m-0 print:p-6 print:max-w-none">
        
        {/* =========================================================
            MODAL ACTION HEADER (HIDDEN DURING PRINT)
            ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base font-heading">
                  Berita Acara Rekapitulasi Suara
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Laporan penetapan perolehan suara sah dan pasangan calon terpilih OSIS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Input Form Drawer */}
            <button
              type="button"
              onClick={() => setIsEditorOpen(!isEditorOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isEditorOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Ubah Nama Ketua Panitia, Pembina OSIS & Kepala Sekolah"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>{isEditorOpen ? 'Tutup Pengaturan Nama' : 'Ubah Nama Penandatangan'}</span>
              {isEditorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================
            MANUAL INPUT PANEL FOR SIGNATORIES (HIDDEN IN PRINT)
            ========================================================= */}
        {isEditorOpen && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-blue-200/80 shadow-xs space-y-4 print:hidden animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading">
                    Input Manual Penandatangan & Nomor Berita Acara
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ketik langsung nama dan NIP penandatangan di bawah. Pratinjau dokumen di bawah akan berubah otomatis.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Kembalikan nama ke contoh default"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Contoh</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSignatories}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-70"
                  title="Simpan nama-nama ini permanen ke database"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Permanen</span>
                </button>
              </div>
            </div>

            {/* Input Grid: 3 Signatories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. KETUA PANITIA */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1. Ketua Panitia Pemilihan</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Ketua Panitia:
                  </label>
                  <input
                    type="text"
                    value={committeeChairmanName}
                    onChange={(e) => setCommitteeChairmanName(e.target.value)}
                    placeholder="Contoh: Muhammad Rizky Pratama"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    NIP / NISN Ketua Panitia:
                  </label>
                  <input
                    type="text"
                    value={committeeChairmanId}
                    onChange={(e) => setCommitteeChairmanId(e.target.value)}
                    placeholder="Contoh: NISN. 0089218291"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2. PEMBINA OSIS */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>2. Pembina OSIS / Kesiswaan</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Pembina OSIS:
                  </label>
                  <input
                    type="text"
                    value={osisAdvisorName}
                    onChange={(e) => setOsisAdvisorName(e.target.value)}
                    placeholder="Contoh: Hendra Gunawan, S.Pd."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    NIP Pembina OSIS:
                  </label>
                  <input
                    type="text"
                    value={osisAdvisorNip}
                    onChange={(e) => setOsisAdvisorNip(e.target.value)}
                    placeholder="Contoh: NIP. 198503152010011012"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 3. KEPALA SEKOLAH */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>3. Kepala Sekolah</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Kepala Sekolah:
                  </label>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => setHeadmasterName(e.target.value)}
                    placeholder="Contoh: Dra. Hj. Sri Wahyuni, M.Pd."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    NIP Kepala Sekolah:
                  </label>
                  <input
                    type="text"
                    value={headmasterNip}
                    onChange={(e) => setHeadmasterNip(e.target.value)}
                    placeholder="Contoh: NIP. 197405201998021001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Input Row: Nomor Surat & Tanggal Surat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Nomor Surat:</span>
                <input
                  type="text"
                  value={reportLetterNumber}
                  onChange={(e) => setReportLetterNumber(e.target.value)}
                  placeholder="Contoh: 042/PPO-OSIS/SMPN2/2026"
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Tanggal Surat:</span>
                <input
                  type="text"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  placeholder="Contoh: Senin, 9 November 2026"
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            PRINTABLE OFFICIAL DOCUMENT (KOP, TABEL, TANDA TANGAN)
            ========================================================= */}
        <div className="text-slate-900 font-serif space-y-6 bg-white p-2 sm:p-4 rounded-2xl">
          {/* KOP SURAT RESMI */}
          <div className="text-center pb-4 border-b-2 border-slate-900 relative">
            <div className="text-xs uppercase tracking-widest text-slate-600 font-sans font-bold">
              PEMERINTAH DAERAH KOTA BOGOR &bull; DINAS PENDIDIKAN
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase mt-1 font-sans">
              {settings.schoolName || 'SMP NEGERI 2 BOGOR'}
            </h1>
            <p className="text-xs text-slate-600 font-sans mt-0.5">
              {settings.schoolAddress || 'Jl. Ir. H. Juanda No. 16, Pabaton, Bogor Tengah, Kota Bogor, Jawa Barat 16121'}
            </p>
            <div className="text-[11px] font-sans font-semibold text-slate-500 mt-0.5 tracking-wider uppercase">
              ORGANISASI SISWA INTRA SEKOLAH (OSIS) &bull; PANITIA PEMILIHAN KETUA & WAKIL KETUA OSIS
            </div>
          </div>

          {/* JUDUL BERITA ACARA */}
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-bold uppercase underline tracking-wide font-sans">
              BERITA ACARA REKAPITULASI HASIL PENGHITUNGAN SUARA
            </h2>
            <p className="text-xs font-sans text-slate-600 font-mono">
              Nomor: {reportLetterNumber}
            </p>
          </div>

          {/* PEMBUKA */}
          <p className="text-xs sm:text-sm leading-relaxed text-justify font-sans">
            Pada hari ini, <strong>{reportDate}</strong>, Panitia Pemilihan Ketua dan Wakil Ketua OSIS {settings.schoolName} periode <strong>{settings.electionPeriod}</strong> telah melaksanakan pemungutan dan penghitungan suara secara elektronik melalui sistem eOSIS. Pemilihan dilaksanakan secara jujur, demokratis, dan rahasia dengan berasaskan <em>Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL)</em>.
          </p>

          {/* REKAPITULASI PEMILIH */}
          <div className="font-sans text-xs sm:text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-xs">DPT Siswa:</span>
                <strong className="text-slate-900 font-mono text-sm">{results?.totalStudents || 0} Siswa</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">DPT Guru & Staff:</span>
                <strong className="text-indigo-700 font-mono text-sm">{results?.totalStaff || 0} Orang</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Total Suara Masuk:</span>
                <strong className="text-emerald-700 font-mono text-sm">{results?.totalVotes || 0} Suara</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Partisipasi Gabungan:</span>
                <strong className="text-blue-700 font-mono text-sm">{results?.participationPercentage || 0}%</strong>
              </div>
            </div>
          </div>

          {/* TABEL HASIL */}
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left text-xs sm:text-sm border border-slate-300">
              <thead className="bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-3 border-r border-slate-300 text-center w-16">No</th>
                  <th className="p-3 border-r border-slate-300">Pasangan Calon Ketua & Wakil Ketua OSIS</th>
                  <th className="p-3 border-r border-slate-300 text-center">Perolehan Suara Sah</th>
                  <th className="p-3 text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results?.candidates?.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 border-r border-slate-300 text-center font-bold">#{c.candidateNo}</td>
                    <td className="p-3 border-r border-slate-300 font-bold">
                      {c.leaderName} ({c.leaderClass}) & {c.viceLeaderName} ({c.viceLeaderClass})
                    </td>
                    <td className="p-3 border-r border-slate-300 text-center font-mono font-bold">
                      {c.votesCount} Suara
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{c.percentage}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                <tr>
                  <td colSpan={2} className="p-3 text-right border-r border-slate-300">
                    Jumlah Seluruh Suara Masuk:
                  </td>
                  <td className="p-3 text-center border-r border-slate-300 font-mono">
                    {results?.totalVotes || 0}
                  </td>
                  <td className="p-3 text-right font-mono">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* PENETAPAN PEMENANG */}
          {winner && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 font-sans text-xs sm:text-sm">
              <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Penetapan Pasangan Calon Terpilih:</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Berdasarkan hasil perolehan suara terbanyak, ditetapkan bahwa pasangan calon nomor urut <strong>#{winner.candidateNo}</strong> atas nama <strong>{winner.leaderName}</strong> (sebagai Ketua OSIS) dan <strong>{winner.viceLeaderName}</strong> (sebagai Wakil Ketua OSIS) dengan perolehan <strong>{winner.votesCount} suara ({winner.percentage}%)</strong> dinyatakan terpilih secara sah untuk memimpin OSIS {settings.schoolName} periode {settings.electionPeriod}.
              </p>
            </div>
          )}

          {/* TANDA TANGAN RESMI TIGA PIHAK (HASIL INPUT MANUAL) */}
          <div className="pt-8 font-sans text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
            
            {/* 1. KETUA PANITIA */}
            <div className="flex flex-col justify-between min-h-[140px]">
              <div className="text-slate-600 font-semibold leading-tight">
                Ketua Panitia Pemilihan OSIS,
              </div>
              <div className="mt-auto">
                <div className="font-bold underline text-slate-900 text-sm">
                  {committeeChairmanName || 'Muhammad Rizky Pratama'}
                </div>
                <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                  {committeeChairmanId || 'NISN. 0089218291'}
                </div>
              </div>
            </div>

            {/* 2. PEMBINA OSIS */}
            <div className="flex flex-col justify-between min-h-[140px]">
              <div className="text-slate-600 font-semibold leading-tight">
                Pembina OSIS / Kesiswaan,
              </div>
              <div className="mt-auto">
                <div className="font-bold underline text-slate-900 text-sm">
                  {osisAdvisorName || 'Hendra Gunawan, S.Pd.'}
                </div>
                <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                  {osisAdvisorNip || 'NIP. 198503152010011012'}
                </div>
              </div>
            </div>

            {/* 3. KEPALA SEKOLAH */}
            <div className="col-span-2 sm:col-span-1 flex flex-col justify-between min-h-[140px]">
              <div className="text-slate-600 font-semibold leading-tight">
                Mengetahui,<br />
                Kepala {settings.schoolName},
              </div>
              <div className="mt-auto">
                <div className="font-bold underline text-slate-900 text-sm">
                  {headmasterName || 'Dra. Hj. Sri Wahyuni, M.Pd.'}
                </div>
                <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                  {headmasterNip || 'NIP. 197405201998021001'}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden in Print) */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format dokumen resmi sesuai standar administrasi kesiswaan sekolah.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Berita Acara</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
