import React, { useState } from 'react';
import { api } from '../api.ts';
import { SchoolSettings, AdminSession } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import {
  Settings,
  School,
  Lock,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  KeyRound,
  ShieldAlert,
  Server,
  Globe,
  FileCode,
  Terminal,
  Copy,
  ExternalLink,
  X,
  Check,
  Laptop,
  Wifi,
  Share2
} from 'lucide-react';

interface AdminSettingsViewProps {
  settings: SchoolSettings;
  admin: AdminSession;
  onSettingsUpdated: (newSettings: SchoolSettings) => void;
  onAdminUpdated: (admin: AdminSession) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  admin,
  onSettingsUpdated,
  onAdminUpdated,
  onShowToast
}) => {
  // Settings Form state
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress || '');
  const [electionPeriod, setElectionPeriod] = useState(settings.electionPeriod);
  const [electionStatus, setElectionStatus] = useState<'open' | 'paused' | 'closed'>(settings.electionStatus || 'open');
  const [electionDate, setElectionDate] = useState(
    settings.electionDate ? settings.electionDate.slice(0, 16) : ''
  );
  const [electionEndDate, setElectionEndDate] = useState(
    settings.electionEndDate ? settings.electionEndDate.slice(0, 16) : ''
  );
  const [isQuickCountPublic, setIsQuickCountPublic] = useState(
    settings.isQuickCountPublic !== false
  );
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [votingRules, setVotingRules] = useState(settings.votingRules || '');
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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Credentials Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(admin.username);
  const [newPassword, setNewPassword] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState(admin.name);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Reset database modal
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);

  // Laravel Modal state
  const [isLaravelModalOpen, setIsLaravelModalOpen] = useState(false);
  const [laravelTab, setLaravelTab] = useState<'overview' | 'laragon' | 'cpanel' | 'vps' | 'env'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Hanya berkas gambar (PNG, JPG, SVG) yang diperbolehkan.');
      return;
    }

    const reader = new FileReader();
    setIsUploadingLogo(true);

    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await api.uploadImage(base64Data, file.name);
        if (res.success) {
          setLogoUrl(res.url);
          onShowToast('success', 'Logo sekolah berhasil diunggah!');
        }
      } catch (err: any) {
        setLogoUrl(reader.result as string);
        onShowToast('info', 'Logo disetel dari berkas lokal.');
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !electionPeriod.trim()) {
      onShowToast('error', 'Nama Sekolah dan Periode Pemilihan wajib diisi.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await api.updateAdminSettings({
        schoolName: schoolName.trim(),
        schoolAddress: schoolAddress.trim(),
        electionPeriod: electionPeriod.trim(),
        electionStatus,
        electionDate: electionDate ? new Date(electionDate).toISOString() : undefined,
        electionEndDate: electionEndDate ? new Date(electionEndDate).toISOString() : undefined,
        isQuickCountPublic,
        logoUrl: logoUrl.trim(),
        votingRules: votingRules.trim(),
        committeeChairmanName: committeeChairmanName.trim(),
        committeeChairmanId: committeeChairmanId.trim(),
        osisAdvisorName: osisAdvisorName.trim(),
        osisAdvisorNip: osisAdvisorNip.trim(),
        headmasterName: headmasterName.trim(),
        headmasterNip: headmasterNip.trim(),
        reportLetterNumber: reportLetterNumber.trim()
      });

      if (res.success) {
        onSettingsUpdated(res.settings);
        onShowToast('success', 'Pengaturan identitas pemilihan berhasil disimpan!');
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      onShowToast('error', 'Masukkan password saat ini untuk memverifikasi perubahan.');
      return;
    }

    setIsSavingCreds(true);
    try {
      const res = await api.updateAdminCredentials({
        currentPassword,
        newUsername: newUsername.trim(),
        newPassword: newPassword ? newPassword.trim() : undefined,
        name: adminDisplayName.trim()
      });

      if (res.success) {
        onAdminUpdated({
          ...admin,
          username: newUsername.trim(),
          name: adminDisplayName.trim()
        });
        setCurrentPassword('');
        setNewPassword('');
        onShowToast('success', 'Kredensial administrator berhasil diperbarui!');
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memperbarui kredensial.');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResettingDb(true);
    try {
      const res = await api.resetEntireDatabase();
      if (res.success) {
        onShowToast('success', 'Database berhasil dikembalikan ke data awal contoh.');
        setIsResetDbModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset database.');
    } finally {
      setIsResettingDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
          Pengaturan Sistem eOSIS
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Atur identitas sekolah, logo, periode pemilihan, status bilik suara, serta keamanan akun panitia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: School & Election Identity Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900 font-heading">
              Identitas Sekolah & Pemilihan
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Sekolah *
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SMP Negeri 2 Bogor"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Periode Pemilihan *
                </label>
                <input
                  type="text"
                  value={electionPeriod}
                  onChange={(e) => setElectionPeriod(e.target.value)}
                  placeholder="Contoh: 2026/2027"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah (Untuk Berita Acara Rekapitulasi)
              </label>
              <input
                type="text"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                placeholder="Jl. Ir. H. Juanda No. 16, Bogor Tengah, Kota Bogor"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Election Status Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Bilik Suara Siswa
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setElectionStatus('open')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    electionStatus === 'open'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Bilik Terbuka (Aktif)
                </button>
                <button
                  type="button"
                  onClick={() => setElectionStatus('paused')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    electionStatus === 'paused'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Dijeda Sementara
                </button>
                <button
                  type="button"
                  onClick={() => setElectionStatus('closed')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    electionStatus === 'closed'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pemilihan Ditutup
                </button>
              </div>
            </div>

            {/* Jadwal Pemilihan & Hitung Mundur */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="font-bold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️ Jadwal Pelaksanaan &amp; Hitung Mundur</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Waktu Mulai Pemilihan (Buka TPS)
                  </label>
                  <input
                    type="datetime-local"
                    value={electionDate}
                    onChange={(e) => setElectionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Digunakan sebagai acuan hitung mundur pembukaan.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Waktu Selesai Pemilihan (Tutup TPS)
                  </label>
                  <input
                    type="datetime-local"
                    value={electionEndDate}
                    onChange={(e) => setElectionEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Batas akhir pemungutan suara bagi seluruh pemilih.</p>
                </div>
              </div>

              {/* Quick Count Public Switch */}
              <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Buka Quick Count untuk Publik</div>
                  <div className="text-[11px] text-slate-500">
                    Jika aktif, pemilih (siswa/guru) dapat memantau perolehan suara sementara di halaman depan.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isQuickCountPublic}
                    onChange={(e) => setIsQuickCountPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* School Logo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logo Sekolah (Unggah atau Tautan URL)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Masukkan URL logo..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isUploadingLogo ? 'Mengunggah...' : 'Unggah Logo Sekolah'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Voting rules text */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pesan / Tata Tertib Bilik Suara Siswa
              </label>
              <textarea
                rows={2}
                value={votingRules}
                onChange={(e) => setVotingRules(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Penandatangan Berita Acara Pemilihan */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                    Penandatangan Resmi Berita Acara Rekapitulasi
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nama dan NIP/NISN ini akan dicetak otomatis pada dokumen Berita Acara penetapan hasil pemilihan.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Format Resmi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Ketua Panitia */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-blue-700">1. Ketua Panitia Pemilihan</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={committeeChairmanName}
                      onChange={(e) => setCommitteeChairmanName(e.target.value)}
                      placeholder="Nama Ketua Panitia"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">NIP / NISN</label>
                    <input
                      type="text"
                      value={committeeChairmanId}
                      onChange={(e) => setCommitteeChairmanId(e.target.value)}
                      placeholder="NISN / NIP"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 2. Pembina OSIS */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-indigo-700">2. Pembina OSIS / Kesiswaan</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={osisAdvisorName}
                      onChange={(e) => setOsisAdvisorName(e.target.value)}
                      placeholder="Nama Pembina OSIS"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">NIP Pembina</label>
                    <input
                      type="text"
                      value={osisAdvisorNip}
                      onChange={(e) => setOsisAdvisorNip(e.target.value)}
                      placeholder="NIP Pembina OSIS"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 3. Kepala Sekolah */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-emerald-700">3. Kepala Sekolah</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={headmasterName}
                      onChange={(e) => setHeadmasterName(e.target.value)}
                      placeholder="Nama Kepala Sekolah"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={headmasterNip}
                      onChange={(e) => setHeadmasterNip(e.target.value)}
                      placeholder="NIP Kepala Sekolah"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nomor Surat Berita Acara Default
                </label>
                <input
                  type="text"
                  value={reportLetterNumber}
                  onChange={(e) => setReportLetterNumber(e.target.value)}
                  placeholder="Contoh: 042/PPO-OSIS/SMPN2/2026"
                  className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Admin Credentials & System Reset */}
        <div className="space-y-6">
          {/* Change Admin Password Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-base text-slate-900 font-heading">
                Keamanan Akun Admin
              </h3>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Admin
                </label>
                <input
                  type="text"
                  value={adminDisplayName}
                  onChange={(e) => setAdminDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru (Kosongkan jika tidak diubah)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">
                  Password Saat Ini (Konfirmasi Keamanan) *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password admin aktif"
                  className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSavingCreds}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>{isSavingCreds ? 'Memperbarui...' : 'Perbarui Kredensial'}</span>
              </button>
            </form>
          </div>

          {/* Laravel Deployment Guide Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-xs">
                <Server className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold">
                Tersedia & Siap Online
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold tracking-tight font-heading">
                Konfigurasi Online Laravel
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Berkas backend Laravel 11/12 (migration MySQL, API controller anti-double voting, dan web server config) telah selesai dibuat di folder <code className="text-indigo-300 font-mono bg-white/10 px-1.5 py-0.5 rounded">/laravel-backend</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setLaravelTab('laragon');
                  setIsLaravelModalOpen(true);
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Laptop className="w-4 h-4" />
                <span>Panduan Laragon (Windows)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLaravelTab('overview');
                  setIsLaravelModalOpen(true);
                }}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <FileCode className="w-4 h-4" />
                <span>Semua Panduan & Berkas</span>
              </button>
            </div>
          </div>

          {/* Reset System Data */}
          <div className="bg-rose-50/60 rounded-3xl p-6 border border-rose-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Zona Pemulihan Data</span>
            </div>
            <p className="text-xs text-rose-700/80 mb-4 leading-relaxed">
              Jika Anda ingin mengulang pengujian dari awal dengan data kelas, siswa, dan kandidat SMPN 2 Bogor default.
            </p>

            <button
              type="button"
              onClick={() => setIsResetDbModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white border border-rose-300 hover:bg-rose-100/70 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Kembalikan ke Data Awal Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetDbModalOpen}
        title="Kembalikan Database ke Data Awal?"
        message="Seluruh perubahan data siswa, kelas, kandidat, dan suara yang Anda masukkan akan diganti kembali ke data contoh bawaan SMP Negeri 2 Bogor."
        confirmLabel="Ya, Pulihkan Data"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isResettingDb}
        onConfirm={handleResetDatabase}
        onCancel={() => setIsResetDbModalOpen(false)}
      />

      {/* Modal Panduan & Konfigurasi Online Laravel */}
      {isLaravelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading">
                      Panduan & Konfigurasi Online Laravel
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200 uppercase tracking-wider">
                      Laravel 11 + MySQL
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Konfigurasi backend mandiri untuk di-hosting di cPanel sekolah atau VPS Ubuntu.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLaravelModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-2 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setLaravelTab('overview')}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  laravelTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>1. Status & Arsitektur</span>
              </button>
              <button
                type="button"
                onClick={() => setLaravelTab('laragon')}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  laravelTab === 'laragon'
                    ? 'border-emerald-600 text-emerald-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Laragon (Windows)</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">Rekomendasi</span>
              </button>
              <button
                type="button"
                onClick={() => setLaravelTab('cpanel')}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  laravelTab === 'cpanel'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>3. Deploy cPanel / Hosting</span>
              </button>
              <button
                type="button"
                onClick={() => setLaravelTab('vps')}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  laravelTab === 'vps'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>4. Deploy VPS (Nginx)</span>
              </button>
              <button
                type="button"
                onClick={() => setLaravelTab('env')}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  laravelTab === 'env'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>5. File .env & Artisan</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700 text-xs sm:text-sm">
              {laravelTab === 'overview' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Aplikasi Saat Ini Telah Aktif Online</span>
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-800/90">
                      Aplikasi eOSIS ini sudah otomatis berjalan online di Cloud Run dan dapat dibagikan kepada panitia/pemilih tanpa instalasi tambahan.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Daftar Berkas Laravel yang Telah Dibuat di Project:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/.env.example</p>
                        <p className="text-slate-500">Konfigurasi database MySQL, App Key, dan CORS.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/routes/api.php</p>
                        <p className="text-slate-500">Endpoint REST API lengkap untuk pemilih & admin.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/database/migrations/</p>
                        <p className="text-slate-500">Tabel settings, classes, candidates, students, staff, admins.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/app/Http/Controllers/Api/</p>
                        <p className="text-slate-500">Controller atomic voting anti-double voting & bulk import.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/nginx-vhost.conf</p>
                        <p className="text-slate-500">Konfigurasi Virtual Host Nginx + SSL Certbot.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-indigo-700 font-mono">/laravel-backend/public/.htaccess</p>
                        <p className="text-slate-500">Konfigurasi Apache URL rewrite & upload 100MB.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {laravelTab === 'laragon' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                      <Laptop className="w-4 h-4 text-emerald-600" />
                      <span>Panduan Lengkap Meng-Online-kan eOSIS di Laragon (Windows)</span>
                    </div>
                    <p className="text-xs text-emerald-800/90 leading-relaxed">
                      Laragon adalah web server lokal Windows yang sangat cepat dan ramah untuk sekolah. Panduan ini menjelaskan cara menjalankan eOSIS di laptop/PC server sekolah serta <strong>3 pilihan cara meng-online-kannya</strong> agar dapat diakses oleh seluruh siswa dan guru.
                    </p>
                  </div>

                  {/* 3 Online Methods Cards */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-indigo-600" />
                      <span>Pilih Salah Satu dari 3 Metode Meng-Online-kan:</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Method 1 */}
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white border border-blue-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                            Metode 1: Paling Cepat
                          </span>
                          <span className="text-xs">⚡ Instan</span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">Fitur "Share" (Ngrok bawaan)</h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Klik kanan Laragon &gt; <strong>Quick app</strong> &gt; <strong>Share</strong> (atau <strong>www &gt; eosis &gt; Share</strong>). Otomatis menghasilkan link HTTPS publik yang langsung bisa dibuka dari HP siswa di mana saja.
                        </p>
                      </div>

                      {/* Method 2 */}
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
                            Metode 2: Rekomendasi
                          </span>
                          <span className="text-xs">🌐 Domain</span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">Cloudflare Tunnel</h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Arahkan domain sekolah (misal <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">osis.smpn2bogor.sch.id</code>) ke PC Laragon. Gratis, SSL otomatis, tanpa sewa VPS & tanpa IP publik.
                        </p>
                      </div>

                      {/* Method 3 */}
                      <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">
                            Metode 3: Tanpa Kuota
                          </span>
                          <span className="text-xs">📶 Wi-Fi</span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">Jaringan Wi-Fi / LAN Sekolah</h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Akses via IP lokal server (contoh <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">http://192.168.1.50/eosis/public</code>). Sangat cepat untuk lab komputer atau bilik suara tanpa butuh kuota internet.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step by step installation */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-600" />
                      <span>Langkah Step-by-Step Menyiapkan di Laragon:</span>
                    </h4>

                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                        <p className="font-bold text-slate-900">1. Tempatkan Berkas di Direktori Laragon</p>
                        <p>
                          Buat folder <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">C:\laragon\www\eosis</code> dan salin seluruh isi folder <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">laravel-backend</code> ke dalamnya.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                        <p className="font-bold text-slate-900">2. Buat Database MySQL di HeidiSQL</p>
                        <p>
                          Buka Laragon, klik tombol <strong>"Database"</strong> (HeidiSQL terbuka), klik kanan sesi MySQL &gt; <strong>Create new &gt; Database</strong>, beri nama <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-emerald-700 font-bold">eosis_db</code> dengan Collation <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">utf8mb4_unicode_ci</code>.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">3. Konfigurasi File .env Laragon</p>
                          <button
                            type="button"
                            onClick={() => handleCopy(`APP_NAME="eOSIS SMP Negeri 2 Bogor"\nAPP_ENV=local\nAPP_DEBUG=true\nAPP_URL=http://eosis.test\n\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=eosis_db\nDB_USERNAME=root\nDB_PASSWORD=`, 'env-laragon')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'env-laragon' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Salin .env Laragon</span>
                          </button>
                        </div>
                        <p className="text-slate-500">
                          Ubah <code className="font-mono">.env.example</code> menjadi <code className="font-mono">.env</code>. Laragon menggunakan user <code className="font-mono font-bold text-slate-800">root</code> dengan password kosong.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">4. Jalankan Perintah di Terminal Laragon</p>
                          <button
                            type="button"
                            onClick={() => handleCopy('cd C:\\laragon\\www\\eosis && composer install && php artisan key:generate && php artisan migrate --seed && php artisan storage:link', 'cmd-laragon')}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'cmd-laragon' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Salin Semua Perintah</span>
                          </button>
                        </div>
                        <div className="p-3 bg-slate-900 text-emerald-400 font-mono rounded-xl text-xs overflow-x-auto space-y-1">
                          <div>cd C:\laragon\www\eosis</div>
                          <div>composer install</div>
                          <div>php artisan key:generate</div>
                          <div>php artisan migrate --seed</div>
                          <div>php artisan storage:link</div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          *Perintah <code className="font-mono">php artisan migrate --seed</code> akan otomatis mengisi akun admin default (<code>admin</code> / <code>admin123</code>), data kandidat, dan contoh siswa &amp; guru.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">5. Cara Meng-Online-kan dengan Cloudflare Tunnel (Opsional jika punya domain)</p>
                          <button
                            type="button"
                            onClick={() => handleCopy('cloudflared tunnel --url http://127.0.0.1:80', 'cmd-cf')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'cmd-cf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Salin Perintah Cloudflared</span>
                          </button>
                        </div>
                        <div className="p-3 bg-slate-900 text-indigo-300 font-mono rounded-xl text-xs flex items-center justify-between">
                          <code>cloudflared tunnel --url http://127.0.0.1:80</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {laravelTab === 'cpanel' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Langkah Deploy di cPanel / Shared Hosting:
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                      <li>
                        <strong>Buat Database MySQL di cPanel:</strong> Buka menu <em>MySQL Database Wizard</em>, buat database (misal: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">eosis_db</code>) beserta user dan password-nya.
                      </li>
                      <li>
                        <strong>Upload Folder Laravel:</strong> Upload folder <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">laravel-backend</code> ke direktori home hosting Anda (misal: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">/home/username/eosis-laravel</code>) di luar folder <em>public_html</em> demi keamanan.
                      </li>
                      <li>
                        <strong>Build Frontend React:</strong> Jalankan <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run build</code>, lalu salin seluruh isi folder <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">dist/</code> ke dalam folder <em>public_html</em> (atau subdomain sekolah).
                      </li>
                      <li>
                        <strong>Konfigurasi .env:</strong> Salin <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env.example</code> menjadi <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> dan sesuaikan kredensial MySQL cPanel Anda.
                      </li>
                      <li>
                        <strong>Jalankan Migration & Seeder via Terminal cPanel:</strong>
                        <div className="mt-1 p-2.5 bg-slate-900 text-emerald-400 font-mono rounded-xl text-xs flex items-center justify-between">
                          <span>php artisan migrate --seed --force</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('php artisan migrate --seed --force', 'cmd-cp')}
                            className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'cmd-cp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {laravelTab === 'vps' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Langkah Cepat Deploy VPS Ubuntu (Nginx + PHP 8.2-FPM):
                    </h4>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">1. Install paket PHP & Nginx:</p>
                      <div className="p-3 bg-slate-900 text-emerald-400 font-mono rounded-xl text-xs flex items-center justify-between">
                        <code className="break-all">sudo apt update && sudo apt install -y nginx mariadb-server php8.2-fpm php8.2-mysql php8.2-curl php8.2-mbstring php8.2-zip unzip git composer</code>
                        <button
                          type="button"
                          onClick={() => handleCopy('sudo apt update && sudo apt install -y nginx mariadb-server php8.2-fpm php8.2-mysql php8.2-curl php8.2-mbstring php8.2-zip unzip git composer', 'vps-pkg')}
                          className="text-slate-400 hover:text-white shrink-0 ml-2 cursor-pointer"
                        >
                          {copiedKey === 'vps-pkg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-slate-700 mt-2">2. Install dependensi & jalankan migration:</p>
                      <div className="p-3 bg-slate-900 text-emerald-400 font-mono rounded-xl text-xs flex items-center justify-between">
                        <code>composer install --no-dev -o && php artisan migrate --seed --force</code>
                        <button
                          type="button"
                          onClick={() => handleCopy('composer install --no-dev -o && php artisan migrate --seed --force', 'vps-art')}
                          className="text-slate-400 hover:text-white shrink-0 ml-2 cursor-pointer"
                        >
                          {copiedKey === 'vps-art' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-slate-700 mt-2">3. Pasang Virtual Host Nginx:</p>
                      <p className="text-xs text-slate-500">
                        Gunakan berkas <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">laravel-backend/nginx-vhost.conf</code> dan pasang SSL gratis via <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">sudo certbot --nginx</code>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {laravelTab === 'env' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Contoh Isi Berkas .env Laravel:
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleCopy(`APP_NAME="eOSIS SMP Negeri 2 Bogor"\nAPP_ENV=production\nAPP_DEBUG=false\nAPP_URL=https://osis.smpn2bogor.sch.id\n\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=eosis_db\nDB_USERNAME=eosis_user\nDB_PASSWORD=secret_password_here\n\nCORS_ALLOWED_ORIGINS="*"`, 'env-copy')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'env-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Salin .env</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono rounded-2xl text-xs overflow-x-auto leading-relaxed">
{`APP_NAME="eOSIS SMP Negeri 2 Bogor"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://osis.smpn2bogor.sch.id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=eosis_db
DB_USERNAME=eosis_user
DB_PASSWORD=secret_password_here

CORS_ALLOWED_ORIGINS="*"`}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 italic">
                *Dokumentasi lengkap tersimpan di <code>laravel-backend/PANDUAN_LARAGON.md</code> &amp; <code>README.md</code>
              </span>
              <button
                type="button"
                onClick={() => setIsLaravelModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-colors"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
