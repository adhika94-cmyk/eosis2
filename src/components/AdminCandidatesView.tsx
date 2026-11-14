import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';
import { Candidate } from '../types.ts';
import { ConfirmModal } from './ConfirmModal.tsx';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Quote,
  CheckCircle2
} from 'lucide-react';

interface AdminCandidatesViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const AdminCandidatesView: React.FC<AdminCandidatesViewProps> = ({ onShowToast }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formCandidateNo, setFormCandidateNo] = useState(1);
  const [formLeaderName, setFormLeaderName] = useState('');
  const [formViceLeaderName, setFormViceLeaderName] = useState('');
  const [formLeaderClass, setFormLeaderClass] = useState('8-A');
  const [formViceLeaderClass, setFormViceLeaderClass] = useState('7-A');
  const [formSlogan, setFormSlogan] = useState('');
  const [formVision, setFormVision] = useState('');
  const [formMissionText, setFormMissionText] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminCandidates();
      setCandidates(data.sort((a, b) => a.candidateNo - b.candidateNo));
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat kandidat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    const nextNo = candidates.length > 0 ? Math.max(...candidates.map((c) => c.candidateNo)) + 1 : 1;
    setFormCandidateNo(nextNo);
    setFormLeaderName('');
    setFormViceLeaderName('');
    setFormLeaderClass('8-A');
    setFormViceLeaderClass('7-A');
    setFormSlogan('');
    setFormVision('');
    setFormMissionText('');
    setFormPhotoUrl('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Candidate) => {
    setIsEditing(true);
    setEditingId(c.id);
    setFormCandidateNo(c.candidateNo);
    setFormLeaderName(c.leaderName);
    setFormViceLeaderName(c.viceLeaderName);
    setFormLeaderClass(c.leaderClass || '8-A');
    setFormViceLeaderClass(c.viceLeaderClass || '7-A');
    setFormSlogan(c.slogan);
    setFormVision(c.vision);
    setFormMissionText(c.mission ? c.mission.join('\n') : '');
    setFormPhotoUrl(c.photoUrl || '');
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Hanya berkas gambar (JPG, PNG, WebP) yang diperbolehkan.');
      return;
    }

    const reader = new FileReader();
    setIsUploadingPhoto(true);

    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const uploadRes = await api.uploadImage(base64Data, file.name);
        if (uploadRes.success) {
          setFormPhotoUrl(uploadRes.url);
          onShowToast('success', 'Foto kandidat berhasil diunggah!');
        }
      } catch (err: any) {
        // Fallback to data url directly if upload route has issue
        setFormPhotoUrl(reader.result as string);
        onShowToast('info', 'Foto digunakan sebagai gambar lokal.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formLeaderName.trim() || !formViceLeaderName.trim() || !formSlogan.trim() || !formVision.trim()) {
      onShowToast('error', 'Nama Ketua, Nama Wakil, Slogan, dan Visi wajib diisi.');
      return;
    }

    const missionArray = formMissionText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        const res = await api.updateCandidate(editingId, {
          candidateNo: Number(formCandidateNo),
          leaderName: formLeaderName.trim(),
          viceLeaderName: formViceLeaderName.trim(),
          leaderClass: formLeaderClass.trim(),
          viceLeaderClass: formViceLeaderClass.trim(),
          slogan: formSlogan.trim(),
          vision: formVision.trim(),
          mission: missionArray,
          photoUrl: formPhotoUrl
        });
        if (res.success) {
          onShowToast('success', `Paslon #${res.candidate.candidateNo} berhasil diperbarui.`);
        }
      } else {
        const res = await api.createCandidate({
          candidateNo: Number(formCandidateNo),
          leaderName: formLeaderName.trim(),
          viceLeaderName: formViceLeaderName.trim(),
          leaderClass: formLeaderClass.trim(),
          viceLeaderClass: formViceLeaderClass.trim(),
          slogan: formSlogan.trim(),
          vision: formVision.trim(),
          mission: missionArray,
          photoUrl: formPhotoUrl
        });
        if (res.success) {
          onShowToast('success', `Paslon #${res.candidate.candidateNo} berhasil ditambahkan.`);
        }
      }
      setIsModalOpen(false);
      fetchCandidates();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan data calon kandidat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteCandidate(deleteTarget.id);
      if (res.success) {
        onShowToast('success', `Paslon #${deleteTarget.candidateNo} berhasil dihapus.`);
        setDeleteTarget(null);
        fetchCandidates();
      }
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus calon kandidat.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Daftar Calon Kandidat OSIS
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Kelola pasangan calon ketua dan wakil ketua OSIS SMPN 2 Bogor, nomor urut, foto, visi, misi, dan slogan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCandidates}
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
            <span>Tambah Calon</span>
          </button>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Memuat data pasangan calon kandidat...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">Belum Ada Calon Terdaftar</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Klik tombol "Tambah Calon" di atas untuk mendaftarkan pasangan nomor urut pertama.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Photo Header */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={cand.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600'}
                    alt={`Paslon ${cand.candidateNo}`}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/20" />

                  {/* Candidate No Badge */}
                  <div className="absolute top-4 left-4 w-12 h-12 rounded-2xl bg-blue-600/90 text-white font-extrabold text-xl flex items-center justify-center shadow-lg backdrop-blur-md font-heading">
                    #{cand.candidateNo}
                  </div>

                  {/* Votes count chip */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold shadow-md">
                    {cand.votesCount || 0} Suara
                  </div>

                  {/* Names on bottom */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-[11px] text-blue-200 font-semibold uppercase tracking-wider">Pasangan Calon</div>
                    <h3 className="text-lg font-extrabold font-heading">{cand.leaderName}</h3>
                    <div className="text-xs font-semibold text-slate-200">& {cand.viceLeaderName}</div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      Ketua: {cand.leaderClass}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      Wakil: {cand.viceLeaderClass}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs italic text-blue-900 flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>"{cand.slogan}"</span>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Visi:</div>
                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">{cand.vision}</p>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Misi ({cand.mission?.length || 0} Poin):</div>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                      {cand.mission?.slice(0, 3).map((m, idx) => (
                        <li key={idx} className="truncate">{m}</li>
                      ))}
                      {cand.mission && cand.mission.length > 3 && (
                        <li className="text-[11px] text-blue-600 italic list-none">+{cand.mission.length - 3} misi lainnya</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openEditModal(cand)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ubah Data</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(cand)}
                  className="py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus Kandidat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Candidate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">
              {isEditing ? `Ubah Data Paslon #${formCandidateNo}` : 'Daftarkan Pasangan Calon Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: No Urut & Slogan */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Urut *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formCandidateNo}
                    onChange={(e) => setFormCandidateNo(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slogan / Motto Kampanye *
                  </label>
                  <input
                    type="text"
                    value={formSlogan}
                    onChange={(e) => setFormSlogan(e.target.value)}
                    placeholder="Contoh: Santun, Unggul, dan Berdaya Saing"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Ketua & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Calon Ketua OSIS *
                  </label>
                  <input
                    type="text"
                    value={formLeaderName}
                    onChange={(e) => setFormLeaderName(e.target.value)}
                    placeholder="Nama lengkap ketua"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas Ketua
                  </label>
                  <input
                    type="text"
                    value={formLeaderClass}
                    onChange={(e) => setFormLeaderClass(e.target.value)}
                    placeholder="Contoh: 8-B"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Wakil & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Calon Wakil Ketua OSIS *
                  </label>
                  <input
                    type="text"
                    value={formViceLeaderName}
                    onChange={(e) => setFormViceLeaderName(e.target.value)}
                    placeholder="Nama lengkap wakil ketua"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas Wakil
                  </label>
                  <input
                    type="text"
                    value={formViceLeaderClass}
                    onChange={(e) => setFormViceLeaderClass(e.target.value)}
                    placeholder="Contoh: 7-C"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Foto Kandidat */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Pasangan Calon (Unggah atau URL)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {formPhotoUrl ? (
                      <img src={formPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      placeholder="Masukkan URL foto atau unggah berkas di bawah..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih Berkas Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploadingPhoto}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 5: Visi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visi Calon *
                </label>
                <textarea
                  rows={2}
                  value={formVision}
                  onChange={(e) => setFormVision(e.target.value)}
                  placeholder="Deskripsikan visi kepemimpinan..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Row 6: Misi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Misi Calon (Pisahkan setiap poin dengan baris baru / Enter)
                </label>
                <textarea
                  rows={4}
                  value={formMissionText}
                  onChange={(e) => setFormMissionText(e.target.value)}
                  placeholder="1. Poin misi pertama&#10;2. Poin misi kedua&#10;3. Poin misi ketiga"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Daftarkan Paslon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Calon Kandidat"
        message={`Apakah Anda yakin ingin menghapus Paslon #${deleteTarget?.candidateNo} (${deleteTarget?.leaderName} & ${deleteTarget?.viceLeaderName})?`}
        confirmLabel="Ya, Hapus Paslon"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
