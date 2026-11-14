import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.ts';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Copy,
  Check,
  X,
  Volume2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface AudioVoiceTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyText?: (text: string) => void;
  title?: string;
  description?: string;
}

export const AudioVoiceTranscriberModal: React.FC<AudioVoiceTranscriberModalProps> = ({
  isOpen,
  onClose,
  onApplyText,
  title = 'Transkripsi Suara AI (Gemini 3.5 Transcribe)',
  description = 'Gunakan mikrofon Anda untuk mendiktekan nomor NISN/NIP, pertanyaan pemilu, atau instruksi dashboard.'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(10));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingCleanup();
      setTranscribedText('');
      setErrorMessage('');
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setErrorMessage('');
    setTranscribedText('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio analyser for real-time waveform visualization
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWave = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              // sample 16 bars
              const step = Math.floor(dataArray.length / 16);
              const levels = Array.from({ length: 16 }, (_, i) => {
                const val = dataArray[i * step] || 0;
                return Math.max(12, Math.min(95, Math.round((val / 255) * 100)));
              });
              setAudioLevel(levels);
              animationFrameRef.current = requestAnimationFrame(updateWave);
            }
          };
          updateWave();
        }
      } catch (err) {
        console.warn('AudioContext visualization not available:', err);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        await processAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // max 60s
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        'Gagal mengakses mikrofon. Pastikan Anda telah memberikan izin mikrofon di peramban (browser) Anda.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await api.transcribeAudio(base64Data, blob.type);
          if (res.success && res.text) {
            setTranscribedText(res.text);
          } else {
            setErrorMessage('Tidak ada suara terdeteksi atau transkripsi kosong.');
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Gagal memproses audio dengan Gemini 3.5 Transcribe.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca rekaman audio.');
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyText && transcribedText) {
      onApplyText(transcribedText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-white">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white font-heading flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Didukung Model <strong>gemini-3.5-transcribe</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopRecordingCleanup();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5 relative z-10">
          {description}
        </p>

        {/* Visualizer & Record Button Area */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center text-center relative z-10">
          {/* Animated Waveform Bars */}
          <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs mb-4">
            {audioLevel.map((lvl, idx) => (
              <span
                key={idx}
                className="w-2 rounded-full transition-all duration-75"
                style={{
                  height: isRecording ? `${lvl}%` : '8px',
                  backgroundColor: isRecording
                    ? lvl > 50
                      ? '#06b6d4'
                      : '#3b82f6'
                    : '#334155'
                }}
              />
            ))}
          </div>

          {/* Record Button */}
          {!isRecording && !isProcessing && (
            <button
              onClick={startRecording}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer active:scale-95"
            >
              <Mic className="w-5 h-5 animate-pulse" />
              <span>Mulai Merekam Suara</span>
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-3.5 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Merekam: {recordingSeconds}s / 60s</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Hentikan & Transkripsi</span>
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center gap-2.5 py-2">
              <div className="w-8 h-8 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-cyan-300">
                Memproses transkripsi suara dengan Gemini 3.5 Transcribe...
              </p>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transcribed Output Section */}
        {transcribedText && (
          <div className="mt-5 relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hasil Transkripsi Suara:</span>
              </label>
              <button
                onClick={handleCopy}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-2xl text-slate-100 text-sm font-medium leading-relaxed max-h-36 overflow-y-auto">
              "{transcribedText}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setTranscribedText('');
                  startRecording();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ulangi Rekaman</span>
              </button>

              {onApplyText && (
                <button
                  onClick={handleApply}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Terapkan ke Form / Input</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer info tips */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tips: Bicaralah dengan artikulasi jelas dekat microphone.</span>
          <span className="text-cyan-400 font-mono text-[10px]">Gemini Speech-to-Text</span>
        </div>
      </div>
    </div>
  );
};
