import React, { useState } from 'react';
import { KeyRound, Download, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { authStorage } from '../api.ts';

interface GeneratedVoterCode {
  id: string;
  nisn?: string;
  nip?: string;
  name: string;
  className?: string;
  role?: string;
  code: string;
}

export const VoterCodeGenerator: React.FC = () => {
  const [loadingType, setLoadingType] = useState<'student' | 'staff' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{
    type: 'student' | 'staff';
    count: number;
    codes: GeneratedVoterCode[];
  } | null>(null);

  const downloadCsv = (type: 'student' | 'staff', codes: GeneratedVoterCode[]) => {
    if (!codes || codes.length === 0) return;

    const headers = Object.keys(codes[0]);
    const csvRows = [
      headers.join(','),
      ...codes.map((row) =>
        headers
          .map((fieldName) => {
            const val = (row as any)[fieldName] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute('download', `kode_pemilih_${type === 'student' ? 'siswa' : 'guru'}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (voterType: 'student' | 'staff') => {
    const label = voterType === 'student' ? 'Siswa' : 'Guru & Staff';
    const confirmed = window.confirm(
      `Terbitkan ulang kode pemilih baru untuk seluruh ${label}?\n\nPERINGATAN: Kode lama yang belum digunakan akan otomatis hangus dan digantikan dengan kode baru.`
    );
    if (!confirmed) return;

    setLoadingType(voterType);
    setError(null);

    try {
      const storage = authStorage as any;
      const token =
        (typeof storage.getAdminToken === 'function' && storage.getAdminToken()) ||
        (typeof storage.getToken === 'function' && storage.getToken('admin')) ||
        storage.adminToken ||
        localStorage.getItem('eosis_admin_token') ||
        localStorage.getItem('adminToken') ||
        '';

      const response = await fetch('/api/admin/voter-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voterType }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal menerbitkan kode pemilih.');
      }

      setResultInfo({
        type: voterType,
        count: data.count,
        codes: data.codes,
      });

      downloadCsv(voterType, data.codes);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-100 space-y-4 shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <span>Penerbitan Kode Pemilih Sekali Pakai</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Terbitkan kode akses 32 karakter dan unduh otomatis dalam format CSV untuk dibagikan secara tertutup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={loadingType !== null}
            onClick={() => handleGenerate('student')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20"
          >
            {loadingType === 'student' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Generate Kode Siswa</span>
          </button>

          <button
            type="button"
            disabled={loadingType !== null}
            onClick={() => handleGenerate('staff')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            {loadingType === 'staff' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Generate Kode Guru (GTK)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resultInfo && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Berhasil menerbitkan <strong>{resultInfo.count}</strong> kode pemilih{' '}
              <strong>{resultInfo.type === 'student' ? 'Siswa' : 'Guru & Staff'}</strong>. File CSV otomatis diunduh.
            </span>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(resultInfo.type, resultInfo.codes)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Ulang CSV</span>
          </button>
        </div>
      )}
    </div>
  );
};