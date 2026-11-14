import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { StudentRecord, ClassItem } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import { StudentBulkImportModal } from './StudentBulkImportModal.tsx';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  AlertTriangle,
  X
} from 'lucide-react';

interface AdminStudentsViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminStudentsView: React.FC<AdminStudentsViewProps> = ({ onShowToast }) => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'voted' | 'unvoted'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formNisn, setFormNisn] = useState('');
  const [formName, setFormName] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('2011-05-15');
  const [formClassId, setFormClassId] = useState('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action targets
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [resetTarget, setResetTarget] = useState<StudentRecord | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Delete All Students state
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Bulk Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, classesData] = await Promise.all([
        api.getAdminStudents({
          search: searchQuery,
          classId: selectedClassId,
          status: selectedStatus
        }),
        api.getAdminClasses()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      if (classesData.length > 0 && !formClassId) {
        setFormClassId(classesData[0].id);
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat data siswa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClassId, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormNisn('');
    setFormName('');
    setFormBirthDate('2011-05-15');
    setFormGender('L');
    if (classes.length > 0) setFormClassId(classes[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (s: StudentRecord) => {
    setIsEditing(true);
    setEditingId(s.id);
    setFormNisn(s.nisn);
    setFormName(s.name);
    setFormBirthDate(s.birthDate);
    setFormClassId(s.classId);
    setFormGender(s.gender || 'L');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNisn.trim() || !formName.trim() || !formBirthDate.trim() || !formClassId) {
      onShowToast('error', 'Semua kolom bertanda wajib harus diisi.');
      return;
    }

    if (!/^\d{10}$/.test(formNisn.trim())) {
      onShowToast('error', 'NISN harus 10 digit angka.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await api.updateStudent(editingId, {
          nisn: formNisn.trim(),
          name: formName.trim(),
          birthDate: formBirthDate.trim(),
          classId: formClassId,
          gender: formGender
        });
        if (res.success) {
          onShowToast('success', `Data siswa ${res.student.name} berhasil diperbarui.`);
        }
      } else {
        const res = await api.createStudent({
          nisn: formNisn.trim(),
          name: formName.trim(),
          birthDate: formBirthDate.trim(),
          classId: formClassId,
          gender: formGender
        });
        if (res.success) {
          onShowToast('success', `Siswa ${res.student.name} berhasil ditambahkan.`);
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan siswa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteStudent(deleteTarget.id);
      if (res.success) {
        onShowToast('success', `Siswa ${deleteTarget.name} berhasil dihapus.`);
        setDeleteTarget(null);
        fetchData();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus siswa.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetVote = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const res = await api.resetStudentVote(resetTarget.id);
      if (res.success) {
        onShowToast('success', `Hak suara untuk ${resetTarget.name} berhasil direset ke belum memilih.`);
        setResetTarget(null);
        fetchData();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset status suara siswa.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetAllVotes = async () => {
    setIsResettingAll(true);
    try {
      const res = await api.resetAllStudentVotes();
      if (res.success) {
        onShowToast('success', res.message || 'Status semua siswa berhasil direset menjadi belum memilih.');
        setIsResetAllModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset status suara semua siswa.');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText.trim().toUpperCase() !== 'HAPUS') {
      onShowToast('error', 'Ketik kata HAPUS dengan tepat untuk mengonfirmasi penghapusan seluruh data siswa.');
      return;
    }
    setIsDeletingAll(true);
    try {
      const res = await api.deleteAllStudents();
      if (res.success) {
        onShowToast('success', res.message || `Seluruh data siswa (${res.count}) berhasil dihapus.`);
        setIsDeleteAllModalOpen(false);
        setDeleteAllConfirmText('');
        fetchData();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus seluruh siswa.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Daftar Pemilih Tetap (DPT Siswa)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Kelola data pemilih, import massal ribuan siswa tanpa batas, dan kelola hak suara.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Reset Suara Semua Siswa */}
          <button
            onClick={() => setIsResetAllModalOpen(true)}
            className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Reset status semua siswa yang sudah memilih menjadi belum memilih"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Reset Suara</span>
            <span className="sm:hidden">Reset</span>
          </button>

          {/* Hapus Semua Siswa */}
          <button
            onClick={() => {
              setDeleteAllConfirmText('');
              setIsDeleteAllModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Hapus seluruh data siswa dari database DPT"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Hapus Semua Siswa</span>
          </button>

          {/* Import Siswa Massal */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Import data siswa secara massal tanpa batas baris"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Massal</span>
          </button>

          {/* Tambah Siswa Single */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan NISN atau Nama Siswa..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="unvoted">Belum Memilih</option>
              <option value="voted">Sudah Memilih</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Menampilkan <strong>{students.length}</strong> siswa</span>
          <span className="text-[11px] text-slate-400 italic">
            *Identitas pilihan kandidat bersifat rahasia dan tidak disimpan di sistem.
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">NISN</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">Tanggal Lahir</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">JK</th>
                <th className="px-6 py-4 text-center">Status Hak Suara</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data pemilih siswa...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada siswa yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <code>{s.nisn}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-slate-900">{s.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {s.birthDate}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        {s.className}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-600">
                        {s.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
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
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Reset Hak Suara (Jadikan Belum Memilih)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ubah Data Siswa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Siswa"
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">
              {isEditing ? 'Ubah Data Siswa Pemilih' : 'Tambah Siswa Pemilih (DPT)'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Siswa Nasional (NISN) *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={10}
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 digit NISN"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Muhammad Bintang Pratama"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Lahir *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={formBirthDate}
                      onChange={(e) => setFormBirthDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelas / Rombel *
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} (Tingkat {c.grade})
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus ${deleteTarget?.name} (NISN: ${deleteTarget?.nisn}) dari daftar pemilih tetap?`}
        confirmLabel="Ya, Hapus Siswa"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset Vote Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(resetTarget)}
        title="Reset Hak Suara Siswa"
        message={`Apakah Anda yakin ingin mereset hak suara siswa ${resetTarget?.name}? Siswa ini akan diizinkan untuk memberikan suara kembali.`}
        confirmLabel="Ya, Reset Hak Suara"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isResetting}
        onConfirm={handleResetVote}
        onCancel={() => setResetTarget(null)}
      />

      {/* Reset ALL Students Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetAllModalOpen}
        title="Reset Hak Suara Seluruh Siswa (DPT)"
        message="PERINGATAN: Aksi ini akan mengembalikan status hak suara SEMUA siswa yang telah memilih menjadi 'Belum Memilih'. Seluruh siswa dapat memberikan suara ulang. Lanjutkan tindakan ini?"
        confirmLabel="Ya, Reset Status Semua Siswa"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isResettingAll}
        onConfirm={handleResetAllVotes}
        onCancel={() => setIsResetAllModalOpen(false)}
      />

      {/* Delete ALL Students Confirmation Modal with strict type confirmation */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 transform transition-all scale-100 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Hapus Seluruh Data Siswa (DPT)?
                </h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Tindakan ini akan menghapus <strong className="text-red-600 font-bold">SELURUH {students.length} data siswa</strong> dari sistem secara permanen. Akun login NISN siswa tidak akan dapat digunakan lagi.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200 space-y-2">
              <label className="block text-xs font-semibold text-red-900">
                Ketik kata <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-300 font-bold">HAPUS</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="Ketik HAPUS di sini..."
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAllModalOpen(false);
                  setDeleteAllConfirmText('');
                }}
                disabled={isDeletingAll}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeletingAll || deleteAllConfirmText.trim().toUpperCase() !== 'HAPUS'}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isDeletingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua ({students.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <StudentBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(msg) => {
          onShowToast('success', msg);
          fetchData();
        }}
      />
    </div>
  );
};
