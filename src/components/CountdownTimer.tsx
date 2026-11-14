import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SchoolSettings } from '../types.ts';

interface CountdownTimerProps {
  settings?: SchoolSettings | null;
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  phase: 'upcoming' | 'ongoing' | 'ended';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ settings, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
    phase: 'upcoming'
  });

  useEffect(() => {
    function calculateTime() {
      const now = new Date().getTime();
      
      // Default to sensible future timestamps if not configured
      const startDateStr = settings?.electionDate || new Date(Date.now() + 86400000).toISOString();
      const endDateStr = settings?.electionEndDate || new Date(Date.now() + 172800000).toISOString();

      const startTime = new Date(startDateStr).getTime();
      const endTime = new Date(endDateStr).getTime();

      let targetTime = startTime;
      let phase: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';

      if (settings?.electionStatus === 'closed') {
        phase = 'ended';
      } else if (now < startTime) {
        phase = 'upcoming';
        targetTime = startTime;
      } else if (now >= startTime && now < endTime) {
        phase = 'ongoing';
        targetTime = endTime;
      } else {
        phase = 'ended';
      }

      const diff = Math.max(0, targetTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        phase
      });
    }

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [settings?.electionDate, settings?.electionEndDate, settings?.electionStatus]);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-xs text-xs font-medium">
        <Clock className={`w-3.5 h-3.5 ${timeLeft.phase === 'ongoing' ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
        <span>
          {timeLeft.phase === 'upcoming' && 'Mulai dalam: '}
          {timeLeft.phase === 'ongoing' && 'Sisa waktu: '}
          {timeLeft.phase === 'ended' && 'Pemilihan Ditutup'}
        </span>
        {timeLeft.phase !== 'ended' && (
          <span className="font-mono font-bold tracking-wider text-cyan-300">
            {timeLeft.days > 0 ? `${timeLeft.days}h ` : ''}
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left header / status */}
        <div className="text-center md:text-left space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md bg-white/10 border border-white/10">
            {timeLeft.phase === 'upcoming' && (
              <>
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">Hitung Mundur Pemilihan</span>
              </>
            )}
            {timeLeft.phase === 'ongoing' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300 font-bold">Sedang Berlangsung</span>
              </>
            )}
            {timeLeft.phase === 'ended' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Pemungutan Suara Selesai</span>
              </>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            {timeLeft.phase === 'upcoming' && 'Menuju Pembukaan TPS Digital'}
            {timeLeft.phase === 'ongoing' && 'Waktu Tersisa untuk Memilih'}
            {timeLeft.phase === 'ended' && 'Periode Pemilihan Telah Ditutup'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            {timeLeft.phase === 'upcoming' &&
              `Pelaksanaan dijadwalkan: ${settings?.electionDate ? new Date(settings.electionDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Segera'}`}
            {timeLeft.phase === 'ongoing' &&
              `Batas akhir pemberian suara: ${settings?.electionEndDate ? new Date(settings.electionEndDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sesuai jadwal'}`}
            {timeLeft.phase === 'ended' &&
              'Terima kasih kepada seluruh siswa dan dewan guru yang telah berpartisipasi.'}
          </p>
        </div>

        {/* Right: Countdown Units */}
        {timeLeft.phase !== 'ended' ? (
          <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 min-w-[64px] sm:min-w-[76px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {pad(timeLeft.days)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300 mt-0.5">
                Hari
              </span>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 min-w-[64px] sm:min-w-[76px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-300">
                {pad(timeLeft.hours)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300 mt-0.5">
                Jam
              </span>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 min-w-[64px] sm:min-w-[76px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-300">
                {pad(timeLeft.minutes)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300 mt-0.5">
                Menit
              </span>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 min-w-[64px] sm:min-w-[76px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300 animate-pulse">
                {pad(timeLeft.seconds)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300 mt-0.5">
                Detik
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl text-center sm:text-left">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Sesi Pemungutan Telah Selesai</p>
              <p className="text-xs text-slate-300">Hasil resmi dapat dilihat melalui Quick Count / Tabulasi Suara.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
