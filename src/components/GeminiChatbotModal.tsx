import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.ts';
import { ChatMessage } from '../types.ts';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  X,
  Mic,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  Info
} from 'lucide-react';
import { AudioVoiceTranscriberModal } from './AudioVoiceTranscriberModal.tsx';

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const GeminiChatbotModal: React.FC<GeminiChatbotModalProps> = ({
  isOpen,
  onClose,
  initialMessage
}) => {
  // Model state with default gemini-3.8-flash
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Chat conversation history state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content:
        'Halo! Saya **Asisten Pintar eOSIS & Pakar UI/UX Dashboard** SMP Negeri 2 Bogor. Ada yang dapat saya bantu terkait cara login, transparansi pemilu, data kandidat OSIS, atau objektif dashboard hari ini?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.8-flash'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceTranscribeOpen, setIsVoiceTranscribeOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (initialMessage && isOpen) {
      sendMessage(initialMessage);
    }
  }, [initialMessage]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare payload with multi-turn messages
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.sendChatMessage(apiMessages, selectedModel);
      if (res.success && res.text) {
        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          role: 'model',
          content: res.text,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: res.modelUsed || selectedModel
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error('Respon tidak valid dari server.');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        content: `Maaf, terjadi kendala saat menghubungi AI: ${err.message || 'Koneksi terputus'}. Silakan coba kembali atau ganti model ke Gemini Flash Lite.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        content: 'Riwayat percakapan telah dibersihkan. Apa yang ingin Anda diskusikan selanjutnya?',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel
      }
    ]);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Bagaimana cara login siswa & guru?',
    'Berapa persen partisipasi saat ini?',
    'Jelaskan visi misi paslon OSIS',
    'Apa saja objektif UI/UX dashboard ini?'
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
        <div
          className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white transition-all duration-300 ${
            isExpanded
              ? 'w-full h-full max-w-5xl max-h-[92vh]'
              : 'w-full max-w-2xl h-[650px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-base font-heading">
                    Asisten Cerdas eOSIS
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Pakar UI/UX Dashboard & Konsultan Pemilu Sekolah</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Model Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  title="Pilih Model Gemini"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-[11px]">
                    {selectedModel === 'gemini-3.8-flash' && '3.8 Flash (General)'}
                    {selectedModel === 'gemini-3.1-flash-lite' && '3.1 Flash Lite (Fast)'}
                    {selectedModel === 'gemini-4-argon' && '4 Argon (Complex)'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-30 text-xs">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Model Gemini
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('gemini-3.8-flash');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex flex-col ${
                        selectedModel === 'gemini-3.8-flash'
                          ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                          : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>gemini-3.8-flash</span>
                        <span className="text-[10px] text-blue-400">Default</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Tugas umum pemilu, analitik & panduan UI/UX
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('gemini-3.1-flash-lite');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex flex-col mt-1 ${
                        selectedModel === 'gemini-3.1-flash-lite'
                          ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                          : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>gemini-3.1-flash-lite</span>
                        <span className="text-[10px] text-amber-400">Super Cepat</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Respon instan untuk Q&A singkat
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('gemini-4-argon');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex flex-col mt-1 ${
                        selectedModel === 'gemini-4-argon'
                          ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                          : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>gemini-4-argon</span>
                        <span className="text-[10px] text-purple-400">Advanced</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Penalaran data kompleks & audit sistem
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Clear History */}
              <button
                type="button"
                onClick={clearChat}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Bersihkan Percakapan"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Kecilkan' : 'Perbesar'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Scrollable Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-sm animate-in fade-in ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'model' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 relative group ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/20'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-xs shadow-sm'
                  }`}
                >
                  {/* Content with simple markdown rendering */}
                  <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans space-y-1.5">
                    {m.content.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph.split('**').map((chunk, cIdx) =>
                          cIdx % 2 === 1 ? (
                            <strong key={cIdx} className="font-bold text-white">
                              {chunk}
                            </strong>
                          ) : (
                            chunk
                          )
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Message Footer: Timestamp, Model, Copy */}
                  <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>{m.timestamp}</span>
                      {m.modelUsed && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/60 font-mono text-[9px] text-cyan-300">
                          {m.modelUsed}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyMessage(m.id, m.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-sm animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-blue-600/50 flex items-center justify-center text-white shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Gemini sedang berpikir dan menganalisis...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Saran:
            </span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="text-xs shrink-0 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              {/* Mic transcription button */}
              <button
                type="button"
                onClick={() => setIsVoiceTranscribeOpen(true)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Bicara dengan Mikrofon (Gemini 3.5 Transcribe)"
              >
                <Mic className="w-5 h-5" />
              </button>

              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan seputar pemilihan OSIS, login, atau objektif dashboard... (Enter untuk kirim)"
                rows={1}
                className="flex-1 bg-transparent border-0 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none resize-none max-h-28 py-1.5"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shrink-0 cursor-pointer"
                title="Kirim Pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
              <span>Model aktif: <strong className="text-slate-300 font-mono">{selectedModel}</strong></span>
              <span>Tekan Shift + Enter untuk baris baru</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Transcriber Modal for Chat input */}
      <AudioVoiceTranscriberModal
        isOpen={isVoiceTranscribeOpen}
        onClose={() => setIsVoiceTranscribeOpen(false)}
        title="Diktekan Pertanyaan Suara"
        description="Bicaralah melalui mikrofon Anda, Gemini 3.5 Transcribe akan mengonversi suara Anda menjadi teks pertanyaan."
        onApplyText={(transcribed) => {
          setInputMessage((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
        }}
      />
    </>
  );
};
