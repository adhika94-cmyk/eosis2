import React, { useState, useRef } from 'react';
import { api } from '../api.ts';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface StudentBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface ParsedStudentRow {
  nisn: string;
  name: string;
  className: string;
  birthDate: string;
  gender: 'L' | 'P';
  isValid: boolean;
  validationError?: string;
}

export const StudentBulkImportModal: React.FC<StudentBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [detectedClasses, setDetectedClasses] = useState<string[]>([]);
  const [autoCreateClass, setAutoCreateClass] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    totalProcessed: number;
    imported: number;
    updated: number;
    skipped: number;
    newClassesCreated: string[];
    errors: string[];
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download template
  const handleDownloadTemplate = () => {
    const csvContent =
      'NISN,Nama Siswa,Kelas,Tanggal Lahir,Jenis Kelamin\n' +
      '0081234501,Aditya Pratama,7A,2011-04-12,L\n' +
      '0081234502,Bella Safitri,7A,2011-08-25,P\n' +
      '0081234503,Dimas Anggara,7B,2011-02-18,L\n' +
      '0081234504,Eka Nurhaliza,8A,2010-11-05,P\n' +
      '0081234505,Farhan Maulana,8B,2010-06-14,L\n' +
      '0081234506,Gita Rahmawati,9A,2009-09-30,P\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_siswa_eosis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper parser for raw text content
  const parseRawText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      setDetectedClasses([]);
      return;
    }

    // Determine delimiter: tab, semicolon, or comma
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    }

    const splitLine = (line: string): string[] => {
      // Split with quotes handling or simple delimiter
      if (delimiter === '\t') {
        return line.split('\t').map((c) => c.trim().replace(/^['"]|['"]$/g, ''));
      }
      
      const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, 'g');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1] !== undefined ? match[1] : match[2];
        if (val === undefined) val = '';
        matches.push(val.trim().replace(/^['"]|['"]$/g, ''));
        if (regex.lastIndex === 0) break;
      }
      return matches.length > 0 ? matches : line.split(delimiter).map((c) => c.trim().replace(/^['"]|['"]$/g, ''));
    };

    // Header detection
    const firstRowCols = splitLine(lines[0]).map((c) => c.toLowerCase());
    let startIndex = 0;

    let nisnIdx = -1;
    let nameIdx = -1;
    let classIdx = -1;
    let dateIdx = -1;
    let genderIdx = -1;

    // Check if first line contains header keywords
    firstRowCols.forEach((col, idx) => {
      if (col.includes('nisn') || col.includes('nomor') || col.includes('no_induk') || col.includes('nis')) {
        nisnIdx = idx;
      } else if (col.includes('nama') || col.includes('name') || col.includes('siswa')) {
        nameIdx = idx;
      } else if (col.includes('kelas') || col.includes('rombel') || col.includes('class')) {
        classIdx = idx;
      } else if (col.includes('tanggal') || col.includes('tgl') || col.includes('lahir') || col.includes('birth') || col.includes('dob')) {
        dateIdx = idx;
      } else if (col.includes('jenis') || col.includes('kelamin') || col.includes('jk') || col.includes('gender') || col.includes('sex')) {
        genderIdx = idx;
      }
    });

    if (nisnIdx !== -1 || nameIdx !== -1 || classIdx !== -1) {
      startIndex = 1; // skip header
    }

    // Fallbacks if not detected by header
    if (nisnIdx === -1) nisnIdx = 0;
    if (nameIdx === -1) nameIdx = 1;
    if (classIdx === -1) classIdx = 2;
    if (dateIdx === -1) dateIdx = 3;
    if (genderIdx === -1) genderIdx = 4;

    const rows: ParsedStudentRow[] = [];
    const classSet = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = splitLine(line);
      const rawNisn = cols[nisnIdx] ? cols[nisnIdx].replace(/[^0-9]/g, '') : '';
      const rawName = cols[nameIdx] ? cols[nameIdx].trim() : '';
      const rawClass = cols[classIdx] ? cols[classIdx].trim() : '7A';
      const rawDate = cols[dateIdx] ? cols[dateIdx].trim() : '2011-01-01';
      const rawGender = cols[genderIdx] ? cols[genderIdx].trim().toUpperCase() : 'L';

      let isValid = true;
      let validationError = '';

      if (!rawNisn) {
        isValid = false;
        validationError = 'NISN kosong atau tidak berupa angka';
      } else if (!rawName) {
        isValid = false;
        validationError = 'Nama siswa kosong';
      }

      // Normalize date to YYYY-MM-DD
      let normalizedDate = '2011-01-01';
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        normalizedDate = rawDate;
      } else {
        const parts = rawDate.split(/[/.-]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }

      const gender = rawGender.startsWith('P') ? 'P' : 'L';

      if (rawClass) {
        classSet.add(rawClass);
      }

      rows.push({
        nisn: rawNisn || cols[nisnIdx] || '',
        name: rawName,
        className: rawClass || '7A',
        birthDate: normalizedDate,
        gender,
        isValid,
        validationError
      });
    }

    setParsedRows(rows);
    setDetectedClasses(Array.from(classSet));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseRawText(text);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteContent(text);
    setImportSummary(null);
    if (text.trim()) {
      parseRawText(text);
    } else {
      setParsedRows([]);
      setDetectedClasses([]);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleStartImport = async () => {
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      const payload = validRows.map((r) => ({
        nisn: r.nisn,
        name: r.name,
        className: r.className,
        birthDate: r.birthDate,
        gender: r.gender
      }));

      const res = await api.importBulkStudents(payload, {
        autoCreateClass,
        updateExisting
      });

      setImportSummary(res);
      onSuccess(res.message);
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan import data siswa.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFileName(null);
    setFileSize(null);
    setPasteContent('');
    setParsedRows([]);
    setDetectedClasses([]);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading">
                  Import Siswa Massal (Unlimited)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                  Tanpa Batas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Unggah ribuan data siswa DPT via file CSV/Excel atau tempel teks secara instan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success summary view if finished */}
          {importSummary ? (
            <div className="space-y-6 py-4 animate-in zoom-in-95 duration-200">
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h4 className="text-xl font-extrabold text-emerald-950 font-heading">
                  Proses Import Siswa Selesai!
                </h4>
                <p className="text-sm text-emerald-800 max-w-lg mx-auto">
                  {importSummary.message}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Diproses</p>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{importSummary.totalProcessed}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <p className="text-[11px] text-emerald-700 font-semibold uppercase">Siswa Baru</p>
                    <p className="text-xl font-black text-emerald-600 mt-0.5">+{importSummary.imported}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <p className="text-[11px] text-blue-700 font-semibold uppercase">Diperbarui</p>
                    <p className="text-xl font-black text-blue-600 mt-0.5">{importSummary.updated}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <p className="text-[11px] text-amber-700 font-semibold uppercase">Dilewati</p>
                    <p className="text-xl font-black text-amber-600 mt-0.5">{importSummary.skipped}</p>
                  </div>
                </div>

                {importSummary.newClassesCreated && importSummary.newClassesCreated.length > 0 && (
                  <div className="mt-4 p-3 bg-white/80 rounded-xl border border-emerald-100 text-left text-xs max-w-xl mx-auto">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Kelas Baru Terdaftar Otomatis ({importSummary.newClassesCreated.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {importSummary.newClassesCreated.map((cn, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px] border border-blue-200"
                        >
                          Kelas {cn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={resetAll}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                >
                  Import Data Lain
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-colors"
                >
                  Selesai & Lihat Daftar DPT
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Guidance & Template Download Bar */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-blue-600 shadow-xs shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Format Kolom Data Siswa
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      Kolom: <strong>NISN</strong>, <strong>Nama Siswa</strong>, <strong>Kelas</strong>, <strong>Tanggal Lahir (YYYY-MM-DD)</strong>, <strong>Jenis Kelamin (L/P)</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-blue-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              {/* Input Method Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'upload'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload File (.csv / .tsv / .txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'paste'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tempel Teks dari Excel / Sheets</span>
                  </button>
                </div>

                {activeTab === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      fileName
                        ? 'border-blue-400 bg-blue-50/30'
                        : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/70'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    {fileName ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">{fileName}</p>
                        <p className="text-xs text-slate-500">
                          Ukuran file: {fileSize} &bull; Klik untuk mengganti file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">
                          Klik untuk memilih file CSV / TSV atau seret ke sini
                        </p>
                        <p className="text-xs text-slate-400">
                          Mendukung file teks ribuan baris tanpa batasan jumlah baris
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={pasteContent}
                      onChange={handlePasteChange}
                      rows={6}
                      placeholder={`Tempel baris data siswa langsung dari Microsoft Excel atau Google Spreadsheet di sini...\nContoh:\n0081234567\tAhmad Fauzi\t7A\t2011-04-12\tL\n0089876543\tSiti Aminah\t7B\t2011-08-25\tP`}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      *Tips: Anda dapat memilih beberapa kolom di Excel (NISN, Nama, Kelas, Tanggal Lahir, Gender) lalu salin (Ctrl+C) dan tempel (Ctrl+V) di sini.
                    </p>
                  </div>
                )}
              </div>

              {/* Options & Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateClass}
                    onChange={(e) => setAutoCreateClass(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Buat Kelas Baru Otomatis</span>
                    <p className="text-slate-500 text-[11px]">
                      Jika kelas pada data belum ada di daftar kelas, sistem otomatis mendaftarkannya.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Perbarui Jika NISN Sudah Terdaftar</span>
                    <p className="text-slate-500 text-[11px]">
                      Jika tidak dicentang, siswa dengan NISN yang sudah ada akan dilewati (skip duplicate).
                    </p>
                  </div>
                </label>
              </div>

              {/* Data Preview Section */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Pratinjau Data Terdeteksi
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                        {validRows.length} data valid
                      </span>
                      {invalidRows.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                          {invalidRows.length} tidak valid
                        </span>
                      )}
                    </div>
                    {detectedClasses.length > 0 && (
                      <p className="text-xs text-slate-500">
                        {detectedClasses.length} kelas ditemukan ({detectedClasses.slice(0, 4).join(', ')}
                        {detectedClasses.length > 4 ? ` +${detectedClasses.length - 4}` : ''})
                      </p>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">NISN</th>
                            <th className="py-2 px-3">Nama Siswa</th>
                            <th className="py-2 px-3">Kelas</th>
                            <th className="py-2 px-3">Tanggal Lahir</th>
                            <th className="py-2 px-3 text-center">JK</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.slice(0, 15).map((row, idx) => (
                            <tr
                              key={idx}
                              className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50'}
                            >
                              <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                {row.nisn || '-'}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">{row.name || '-'}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                  {row.className}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">{row.birthDate}</td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    row.gender === 'L'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-pink-50 text-pink-700'
                                  }`}
                                >
                                  {row.gender}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {row.validationError}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 15 && (
                      <div className="py-2 px-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                        + {parsedRows.length - 15} baris data lainnya siap diproses ke database.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importSummary && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-white transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleStartImport}
              disabled={isProcessing || validRows.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses {validRows.length} Siswa...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Proses Import ({validRows.length} Siswa)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
