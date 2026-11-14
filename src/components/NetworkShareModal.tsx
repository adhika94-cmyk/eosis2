import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { SchoolSettings, NetworkInfo } from '../types.ts';
import { api } from '../api.ts';
import {
  Wifi,
  QrCode,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Server,
  HelpCircle,
  X,
  RefreshCw,
  Radio,
  FileCode,
  Info
} from 'lucide-react';

interface NetworkShareModalProps {
  settings: SchoolSettings;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const NetworkShareModal: React.FC<NetworkShareModalProps> = ({
  settings,
  isOpen,
  onClose,
  onShowToast
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCopiedCmd, setIsCopiedCmd] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'quick' | 'firewall' | 'hotspot' | 'laragon'>('quick');
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch Network Info from Backend
  const fetchNetwork = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNetworkInfo();
      setNetworkInfo(data);

      // Determine initial active URL
      const currentHost = window.location.host;
      const currentProtocol = window.location.protocol;
      const currentUrl = `${currentProtocol}//${currentHost}`;

      if (data.addresses && data.addresses.length > 0) {
        setSelectedUrl(data.addresses[0].url);
      } else if (currentHost && !currentHost.includes('localhost') && !currentHost.includes('127.0.0.1')) {
        setSelectedUrl(currentUrl);
      } else {
        setSelectedUrl(`http://192.168.1.100:${data.port || 3000}`);
      }
    } catch {
      // Fallback to window.location
      const port = window.location.port || '3000';
      const fallbackUrl = window.location.origin.includes('localhost')
        ? `http://192.168.1.100:${port}`
        : window.location.origin;

      setSelectedUrl(fallbackUrl);
      setNetworkInfo({
        success: true,
        port: Number(port) || 3000,
        hostname: 'localhost',
        currentOrigin: window.location.origin,
        addresses: [
          { name: 'Wi-Fi / LAN', address: '192.168.1.100', family: 'IPv4', url: `http://192.168.1.100:${port}` }
        ],
        recommendedUrl: fallbackUrl,
        firewallWindowsCmd: `netsh advfirewall firewall add rule name="eOSIS_Port_${port}" dir=in action=allow protocol=TCP localport=${port}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNetwork();
    }
  }, [isOpen]);

  // Render QR Code to Canvas whenever selectedUrl changes
  useEffect(() => {
    if (!selectedUrl) return;

    const renderQr = (canvas: HTMLCanvasElement | null, size: number) => {
      if (!canvas) return;
      QRCode.toCanvas(
        canvas,
        selectedUrl,
        {
          width: size,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        },
        (err) => {
          if (err) console.error('Error rendering QR code:', err);
        }
      );
    };

    renderQr(canvasRef.current, 220);
    if (isProjectorMode) {
      renderQr(projectorCanvasRef.current, 360);
    }
  }, [selectedUrl, isProjectorMode, isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(selectedUrl);
      setIsCopied(true);
      onShowToast('success', 'URL akses berhasil disalin ke clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      onShowToast('info', `Salin manual URL: ${selectedUrl}`);
    }
  };

  const handleCopyCmd = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setIsCopiedCmd(true);
      onShowToast('success', 'Perintah firewall Windows berhasil disalin!');
      setTimeout(() => setIsCopiedCmd(false), 2500);
    } catch {
      onShowToast('info', 'Silakan salin manual perintah.');
    }
  };

  const handleDownloadQr = () => {
    const canvas = isProjectorMode ? projectorCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `QRCode-eOSIS-${settings.schoolName || 'SMPN2'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    onShowToast('success', 'QR Code berhasil diunduh dalam format PNG!');
  };

  const handleApplyCustomIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIp.trim()) return;
    let url = customIp.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    if (!url.includes(':', 6) && !url.includes('.sch.id') && !url.includes('.app')) {
      url = `${url}:${networkInfo?.port || 3000}`;
    }
    setSelectedUrl(url);
    onShowToast('info', `URL dialihkan ke: ${url}`);
  };

  const firewallCmd =
    networkInfo?.firewallWindowsCmd ||
    `netsh advfirewall firewall add rule name="eOSIS_Port_3000" dir=in action=allow protocol=TCP localport=3000`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      {/* FULLSCREEN PROJECTOR MODE */}
      {isProjectorMode ? (
        <div className="fixed inset-0 bg-slate-950 text-white z-60 flex flex-col justify-between p-6 sm:p-12 animate-fade-in">
          {/* Top Bar Projector */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/40 p-2 flex items-center justify-center">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Wifi className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading text-white">
                  {settings.schoolName || 'SMP Negeri 2 Bogor'}
                </h1>
                <p className="text-blue-400 text-sm sm:text-lg font-medium mt-1">
                  Bilik Suara Pemilihan eOSIS &bull; Periode {settings.electionPeriod}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadQr}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 border border-slate-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar QR</span>
              </button>
              <button
                onClick={() => setIsProjectorMode(false)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Tutup Mode Proyektor</span>
              </button>
            </div>
          </div>

          {/* Central QR Code Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto my-auto w-full py-6">
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl">
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-blue-500/30">
                <canvas ref={projectorCanvasRef} className="rounded-2xl" />
              </div>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs uppercase tracking-wider border border-blue-400/30">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> Scan Menggunakan Kamera HP
                </span>
                <p className="text-xs text-slate-400 mt-2">
                  Arahkan kamera smartphone ke QR Code di atas untuk membuka bilik suara secara instan
                </p>
              </div>
            </div>

            {/* Instruction Side */}
            <div className="space-y-6 text-left">
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 font-heading">
                  <Smartphone className="w-6 h-6 text-blue-400" />
                  <span>Petunjuk Mencoblos Dari HP / Perangkat Siswa</span>
                </h3>

                <ol className="space-y-4 text-slate-300 text-sm sm:text-base">
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      Hubungkan smartphone/laptop Anda ke jaringan <strong>Wi-Fi Sekolah</strong> atau Hotspot Panitia.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <span>Buka browser (Google Chrome / Safari) lalu kunjungi alamat:</span>
                      <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-400 font-bold text-base sm:text-lg break-all select-all flex items-center justify-between">
                        <span>{selectedUrl}</span>
                        <button
                          onClick={handleCopyUrl}
                          className="ml-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                        >
                          {isCopied ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      Masukkan <strong>NISN</strong> dan <strong>Tanggal Lahir</strong> (YYYY-MM-DD), lalu coblos paslon pilihan Anda secara <strong>LUBER & JURDIL</strong>!
                    </span>
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs sm:text-sm">
                <Radio className="w-5 h-5 text-emerald-400 shrink-0 animate-ping" />
                <span>
                  Sistem beroperasi lokal berkecepatan tinggi. 1 pemilih hanya memiliki 1 hak suara terenkripsi.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Server Hostname: {networkInfo?.hostname || 'Localhost'} &bull; Port: {networkInfo?.port || 3000}</span>
            <span>Tekan tombol di kanan atas untuk kembali ke Dashboard Admin</span>
          </div>
        </div>
      ) : (
        /* STANDARD MODAL VIEW */
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center shadow-inner">
                <Wifi className="w-6 h-6 text-blue-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight font-heading text-white">
                    Konfigurasi Akses Wi-Fi Lokal & Berbagi Perangkat
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                    Aktif (0.0.0.0)
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  Buka aplikasi eOSIS di HP, tablet, atau komputer siswa dalam satu jaringan Wi-Fi sekolah
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Quick Action Card: Active URL & QR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-5 bg-slate-50 border border-slate-200 rounded-3xl">
              {/* QR Code Canvas */}
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <canvas ref={canvasRef} className="rounded-xl" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleDownloadQr}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Unduh QR</span>
                  </button>
                  <button
                    onClick={() => setIsProjectorMode(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Layar Penuh Proyektor</span>
                  </button>
                </div>
              </div>

              {/* URL Selection & Info */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>Alamat Akses yang Dibagikan ke Pemilih:</span>
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 px-3.5 py-2.5 bg-white border-2 border-blue-500/40 rounded-xl font-mono text-sm sm:text-base font-bold text-slate-900 shadow-inner flex items-center justify-between overflow-x-auto">
                      <span>{selectedUrl || 'Memuat alamat IP...'}</span>
                      <a
                        href={selectedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-blue-600 ml-2"
                        title="Buka di tab baru"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <button
                      onClick={handleCopyUrl}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? 'Tersalin!' : 'Salin URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Detected Network Interfaces */}
                {networkInfo && networkInfo.addresses && networkInfo.addresses.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1.5">
                      Pilih Antarmuka Jaringan Server Terdeteksi:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {networkInfo.addresses.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedUrl(item.url)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedUrl === item.url
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Wifi className="w-3 h-3" />
                          <span>
                            {item.name}: {item.address}
                          </span>
                        </button>
                      ))}

                      {networkInfo.currentOrigin && !selectedUrl.includes(networkInfo.currentOrigin) && (
                        <button
                          type="button"
                          onClick={() => setSelectedUrl(networkInfo.currentOrigin)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          Domain Saat Ini ({networkInfo.currentOrigin})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Custom IP Override */}
                <form onSubmit={handleApplyCustomIp} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Ketik manual IP lain (contoh: 192.168.1.50 atau eosis.local)"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Gunakan IP
                  </button>
                </form>
              </div>
            </div>

            {/* Navigation Tabs for Guides */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('quick')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'quick'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>1. Cara Cepat Hubungkan HP Siswa</span>
                </button>
                <button
                  onClick={() => setActiveTab('firewall')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'firewall'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>2. Buka Firewall Windows (Port 3000)</span>
                </button>
                <button
                  onClick={() => setActiveTab('hotspot')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'hotspot'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>3. Mode Hotspot HP (Offline Tanpa Pulsa)</span>
                </button>
                <button
                  onClick={() => setActiveTab('laragon')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'laragon'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>4. Konfigurasi Laragon / Apache</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="pt-4">
                {activeTab === 'quick' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                          1
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Hubungkan ke Wi-Fi yang Sama</h5>
                        <p className="text-slate-600">
                          Pastikan komputer server dan smartphone/laptop siswa terhubung ke satu nama Wi-Fi (SSID) yang sama di sekolah.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                          2
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Scan QR atau Buka Link</h5>
                        <p className="text-slate-600">
                          Siswa membuka aplikasi Kamera HP atau membuka Google Chrome, lalu mengetik alamat URL di atas atau scan barcode QR.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                          3
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Login & Pencoblosan</h5>
                        <p className="text-slate-600">
                          Siswa memasukkan NISN & Tanggal Lahir untuk masuk ke bilik suara dan mencoblos kandidat pilihannya secara rahasia.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-900 text-xs">
                          Jika HP Siswa Tidak Bisa Membuka Halaman (Loading / Connection Refused):
                        </div>
                        <p className="text-amber-800 text-xs mt-0.5">
                          Biasanya disebabkan oleh <strong>Windows Defender Firewall</strong> di komputer server yang belum mengizinkan port 3000. Buka tab <strong>"2. Buka Firewall Windows"</strong> di atas untuk solusi 1-klik.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'firewall' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <p className="text-slate-600">
                      Secara bawaan, Windows memblokir akses port 3000 dari perangkat luar. Jalankan perintah di bawah ini di komputer server untuk membukanya secara aman:
                    </p>

                    <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Command Prompt (CMD) &bull; Run as Administrator</span>
                        <button
                          onClick={() => handleCopyCmd(firewallCmd)}
                          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded-lg cursor-pointer"
                        >
                          {isCopiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopiedCmd ? 'Tersalin' : 'Salin Perintah'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl font-mono text-emerald-400 text-xs break-all select-all">
                        {firewallCmd}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h6 className="font-bold text-slate-800">Langkah Menjalankannya di Windows Server:</h6>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        <li>Buka menu Start Windows, ketik <strong>cmd</strong>.</li>
                        <li>Klik kanan pada <strong>Command Prompt</strong>, lalu pilih <strong>"Run as administrator"</strong>.</li>
                        <li>Paste (tempel) perintah di atas lalu tekan <strong>Enter</strong>. Tulisan <em>"Ok."</em> akan muncul jika berhasil.</li>
                        <li>Sekarang seluruh smartphone siswa langsung bisa membuka URL tanpa halangan!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {activeTab === 'hotspot' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                      <h5 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-blue-600" />
                        <span>Pemilihan 100% Offline Tanpa Membutuhkan Kuota Internet</span>
                      </h5>
                      <p className="text-blue-800 mt-1">
                        Aplikasi eOSIS dirancang mandiri dengan database lokal. Anda bisa memanfaatkan 1 buah smartphone panitia sebagai pemancar Hotspot tanpa perlu ada paket data aktif.
                      </p>
                    </div>

                    <ol className="space-y-2 text-slate-600 list-decimal list-inside pl-1">
                      <li>Nyalakan <strong>Hotspot Portabel / Personal Hotspot</strong> pada HP panitia (misal nama: <em>"PEMILIHAN_OSIS"</em>).</li>
                      <li>Koneksikan laptop server ke hotspot tersebut.</li>
                      <li>Koneksikan HP para siswa ke hotspot yang sama.</li>
                      <li>Buka link <code>{selectedUrl}</code> pada browser siswa. Seluruh data suara akan masuk langsung ke laptop server dengan kecepatan instan!</li>
                    </ol>
                  </div>
                )}

                {activeTab === 'laragon' && (
                  <div className="space-y-4 text-xs text-slate-700">
                    <p className="text-slate-600">
                      Jika sekolah Anda memilih menjalankan backend PHP Laravel menggunakan <strong>Laragon</strong>:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                        <h6 className="font-bold text-slate-900 text-xs">Opsi A: Fitur "Share" Laragon (Ngrok)</h6>
                        <p className="text-slate-600 text-[11px]">
                          Klik kanan Laragon &gt; <strong>Quick app</strong> &gt; <strong>Share</strong>. URL HTTPS publik otomatis dibuat sehingga siswa bisa memilih dari mana saja via internet.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                        <h6 className="font-bold text-slate-900 text-xs">Opsi B: Apache IP Akses</h6>
                        <p className="text-slate-600 text-[11px]">
                          Buka <code>http://[IP_KOMPUTER]/eosis/public</code> pada browser siswa, dan pastikan Apache diizinkan lewat Windows Defender Firewall.
                        </p>
                      </div>
                    </div>

                    <div className="text-slate-500 text-[11px]">
                      Panduan lengkap langkah demi langkah telah tersedia di berkas <code>laravel-backend/PANDUAN_LARAGON.md</code> di dalam folder proyek.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Vite & Express Server mendengarkan pada: <strong>0.0.0.0:{networkInfo?.port || 3000}</strong></span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsProjectorMode(true)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Mode Proyektor</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
