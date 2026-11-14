import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { ClassItem } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import { DoorClosed, Plus, Edit2, Trash2, Search, Users, RefreshCw } from 'lucide-react';

interface AdminClassesViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminClassesView: React.FC<AdminClassesViewProps> = ({ onShowToast }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminClasses();
      setClasses(data);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat daftar kelas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormName('');
    setFormGrade(7);
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setIsEditing(true);
    setEditingId(c.id);
    setFormName(c.name);
    setFormGrade(c.grade || 7);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('error', 'Nama kelas tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await api.updateClass(editingId, formName.trim(), Number(formGrade));
        if (res.success) {
          onShowToast('success', `Kelas ${res.classItem.name} berhasil diperbarui.`);
        }
      } else {
        const res = await api.createClass(formName.trim(), Number(formGrade));
        if (res.success) {
          onShowToast('success', `Kelas ${res.classItem.name} berhasil ditambahkan.`);
        }
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteClass(deleteTarget.id);
      if (res.success) {
        onShowToast('success', `Kelas ${deleteTarget.name} berhasil dihapus.`);
        setDeleteTarget(null);
        fetchClasses();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus kelas.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Manajemen Data Kelas
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Daftar kelas rombel untuk pembagian Daftar Pemilih Tetap (DPT) siswa SMPN 2 Bogor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchClasses}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama kelas (contoh: 8-B)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <span>Total Kelas: <strong className="text-slate-900">{classes.length}</strong></span>
          <span>&bull;</span>
          <span>Hasil Pencarian: <strong className="text-blue-600">{filteredClasses.length}</strong></span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Rombel / Kelas</th>
                <th className="px-6 py-4">Tingkat</th>
                <th className="px-6 py-4 text-center">Jumlah Siswa</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data kelas...</span>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Tidak ada kelas yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((c, index) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <DoorClosed className="w-4 h-4 text-blue-600" />
                        <span>Kelas {c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                        Tingkat {c.grade || 7}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span>{c.studentCount || 0} Siswa</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Kelas"
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

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">
              {isEditing ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kelas / Rombel
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: 7-A, 8-B, 9-C"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat / Jenjang
                </label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  <option value={7}>Kelas 7 (Tujuh)</option>
                  <option value={8}>Kelas 8 (Delapan)</option>
                  <option value={9}>Kelas 9 (Sembilan)</option>
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
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus Kelas ${deleteTarget?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Kelas"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
