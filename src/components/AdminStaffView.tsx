import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { StaffRecord } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  RefreshCw,
  KeyRound,
  Briefcase,
  User,
  Sparkles
} from 'lucide-react';

interface AdminStaffViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminStaffView: React.FC<AdminStaffViewProps> = ({ onShowToast }) => {
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'voted' | 'unvoted'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formNip, setFormNip] = useState('');
  const [formName, setFormName] = useState('');
  const [formBirthYear, setFormBirthYear] = useState('1985');
  const [formRole, setFormRole] = useState('Guru Mata Pelajaran');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action targets
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [resetTarget, setResetTarget] = useState<StaffRecord | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminStaff({
        search: searchQuery,
        status: selectedStatus
      });
      setStaffList(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat data guru dan staff.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormNip('');
    setFormName('');
    setFormBirthYear('1985');
    setFormRole('Guru Mata Pelajaran');
    setFormGender('L');
    setIsModalOpen(true);
  };

  const openEditModal = (s: StaffRecord) => {
    setIsEditing(true);
    setEditingId(s.id);
    setFormNip(s.nip);
    setFormName(s.name);
    setFormBirthYear(s.birthYear);
    setFormRole(s.role || 'Guru Mata Pelajaran');
    setFormGender(s.gender || 'L');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNip.trim() || !formName.trim() || !formBirthYear.trim()) {
      onShowToast('error', 'NIP, Nama Lengkap, dan Tahun Lahir wajib diisi.');
      return;
    }

    if (!/^\d{4}$/.test(formBirthYear.trim())) {
      onShowToast('error', 'Tahun Lahir harus berupa 4 digit angka (contoh: 1985).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await api.updateStaff(editingId, {
          nip: formNip.trim(),
          name: formName.trim(),
          birthYear: formBirthYear.trim(),
          role: formRole.trim(),
          gender: formGender
        });
        if (res.success) {
          onShowToast('success', `Data ${res.staff.name} berhasil diperbarui.`);
        }
      } else {
        const res = await api.createStaff({
          nip: formNip.trim(),
          name: formName.trim(),
          birthYear: formBirthYear.trim(),
          role: formRole.trim(),
          gender: formGender
        });
        if (res.success) {
          onShowToast('success', `Guru/Staff ${res.staff.name} berhasil ditambahkan.`);
        }
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteStaff(deleteTarget.id);
      if (res.success) {
        onShowToast('success', `Data ${deleteTarget.name} berhasil dihapus.`);
        setDeleteTarget(null);
        fetchStaff();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetVote = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const res = await api.resetStaffVote(resetTarget.id);
      if (res.success) {
        onShowToast('success', `Hak suara untuk ${resetTarget.name} berhasil direset menjadi belum memilih.`);
        setResetTarget(null);
        fetchStaff();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset status suara.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetAllVotes = async () => {
    setIsResettingAll(true);
    try {
      const res = await api.resetAllStaffVotes();
      if (res.success) {
        onShowToast('success', res.message || 'Status semua guru/staff berhasil direset menjadi belum memilih.');
        setIsResetAllModalOpen(false);
        fetchStaff();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset status suara semua guru/staff.');
    } finally {
      setIsResettingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            <span>Data Pemilih Guru & Staff (GTK)</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Kelola hak pilih dewan guru dan tenaga kependidikan SMPN 2 Bogor (Login: User <strong>NIP</strong>, Password <strong>Tahun Lahir</strong>).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStaff}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsResetAllModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Reset status semua guru/staff yang sudah memilih menjadi belum memilih"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Reset Suara Semua GTK</span>
            <span className="sm:hidden">Reset Semua</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru / Staff</span>
          </button>
        </div>
      </div>

      {/* Info Card: NIP + Tahun Lahir */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-indigo-900 text-sm">
              Skema Kredensial Login Pemilih Guru & Tenaga Kependidikan
            </div>
            <div className="text-indigo-800 text-xs mt-0.5">
              Guru & Staff dapat masuk di Bilik Suara dengan <strong>NIP</strong> sebagai User ID dan <strong>Tahun Lahir (4 digit)</strong> sebagai Password.
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] bg-white/80 border border-indigo-200 px-3 py-1.5 rounded-xl">
          <span>Contoh:</span>
          <strong>NIP 198503152010011012</strong> &bull; <strong>Thn: 1985</strong>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan NIP, Nama Guru/Staff, atau Jabatan..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">Semua Status Suara</option>
              <option value="unvoted">Belum Memilih</option>
              <option value="voted">Sudah Memilih</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Menampilkan <strong>{staffList.length}</strong> guru dan tenaga kependidikan</span>
          <span className="text-[11px] text-slate-400 italic">
            *Kerahasiaan suara guru dan staf terjamin aman dan anonim.
          </span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">NIP / ID Pegawai</th>
                <th className="px-6 py-4">Nama Lengkap & Gelar</th>
                <th className="px-6 py-4">Jabatan / Unit Tugas</th>
                <th className="px-6 py-4">Password (Tahun Lahir)</th>
                <th className="px-6 py-4 text-center">Status Hak Suara</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data guru dan staff...</span>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada data guru/staff yang sesuai.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <code>{s.nip}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>{s.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {s.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{s.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold">
                        {s.birthYear}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.hasVoted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sudah Memilih</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Belum Memilih</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.hasVoted && (
                          <button
                            onClick={() => setResetTarget(s)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Reset Hak Suara Guru/Staff"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Ubah Data Guru/Staff"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Guru/Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">
              {isEditing ? 'Ubah Data Guru / Staff' : 'Tambah Pemilih Guru / Staff'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Pegawai (NIP / NUPTK / ID) *
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Contoh: 198503152010011012"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Digunakan sebagai username login pemilih.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Hendra Gunawan, S.Pd."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Lahir (Password) *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formBirthYear}
                    onChange={(e) => setFormBirthYear(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 1985"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Password 4 digit tahun.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan / Mata Pelajaran / Unit Kerja
                </label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Contoh: Guru IPA / Pembina OSIS / Staf Tata Usaha"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Data Guru / Staff"
        message={`Apakah Anda yakin ingin menghapus ${deleteTarget?.name} (NIP: ${deleteTarget?.nip}) dari daftar pemilih?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset Vote Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(resetTarget)}
        title="Reset Hak Suara Guru / Staff"
        message={`Apakah Anda yakin ingin mereset hak suara ${resetTarget?.name}? Guru/Staff ini akan diizinkan memberikan suara kembali.`}
        confirmLabel="Ya, Reset Hak Suara"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isResetting}
        onConfirm={handleResetVote}
        onCancel={() => setResetTarget(null)}
      />

      {/* Reset ALL Staff Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetAllModalOpen}
        title="Reset Hak Suara Seluruh Guru & Staff"
        message="PERINGATAN: Aksi ini akan mengembalikan status hak suara SEMUA guru dan tenaga kependidikan yang telah memilih menjadi 'Belum Memilih'. Seluruh GTK dapat memberikan suara ulang. Lanjutkan tindakan ini?"
        confirmLabel="Ya, Reset Status Semua Guru/Staff"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isResettingAll}
        onConfirm={handleResetAllVotes}
        onCancel={() => setIsResetAllModalOpen(false)}
      />
    </div>
  );
};
