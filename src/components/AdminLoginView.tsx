import React, { useState, useEffect, useRef } from 'react';
import { api, authStorage } from '../api.ts';
import { SchoolSettings, AdminSession } from '../types.ts';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowLeft,
  KeyRound,
  ArrowRight,
  Bot,
  Lightbulb,
  Mic,
  Volume2,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { AudioVoiceTranscriberModal } from './AudioVoiceTranscriberModal.tsx';

interface AdminLoginViewProps {
  settings: SchoolSettings;
  onLoginSuccess: (admin: AdminSession) => void;
  onBackToStudent: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenAI?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  settings,
  onLoginSuccess,
  onBackToStudent,
  onShowToast,
  onOpenAI
}) => {
  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mfaStage, setMfaStage] = useState<'credentials'|'setup'|'verify'>('credentials');
  const [setupToken, setSetupToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Interactive Lamp State
  const [lampOn, setLampOn] = useState(true); // Default ON for immediate usability, user can toggle & pull rope anytime!
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Rope Physics Refs & State
  const pullRopeRef = useRef<HTMLDivElement>(null);
  const ropeHandleRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const velocityRef = useRef(0);
  const swingAngleRef = useRef(0);
  const swingVelocityRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const lampOnRef = useRef(true);

  // Keep lampOnRef in sync with state
  useEffect(() => {
    lampOnRef.current = lampOn;
  }, [lampOn]);

  // Web Audio click effect
  const playClickSound = (isTurningOn: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = isTurningOn ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isTurningOn ? 750 : 420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {
      // AudioContext optional
    }
  };

  const toggleLamp = () => {
    const nextState = !lampOnRef.current;
    lampOnRef.current = nextState;
    setLampOn(nextState);
    playClickSound(nextState);

    // Give a nice swing impulse
    swingVelocityRef.current += nextState ? 12 : -12;
    velocityRef.current += 15;
  };

  // Rope Physics Animation Loop
  useEffect(() => {
    let animId: number;
    const maxPull = 120;
    const springStrength = 0.09;
    const damping = 0.86;
    const swingStrength = 0.16;

    const animate = () => {
      if (!isDraggingRef.current) {
        const force = -pullRef.current * springStrength;
        velocityRef.current += force;
        velocityRef.current *= damping;
        pullRef.current += velocityRef.current;

        if (Math.abs(pullRef.current) < 0.2) {
          pullRef.current = 0;
          velocityRef.current = 0;
        }
      }

      swingVelocityRef.current += -swingAngleRef.current * 0.05;
      swingVelocityRef.current *= 0.9;
      swingAngleRef.current += swingVelocityRef.current + velocityRef.current * swingStrength;

      // Update DOM
      const ropeBaseHeight = 70;
      const ropeTop = 125;
      const newHeight = ropeBaseHeight + pullRef.current;

      if (pullRopeRef.current) {
        pullRopeRef.current.style.height = `${newHeight}px`;
        pullRopeRef.current.style.transform = `rotate(${swingAngleRef.current * 0.25}deg)`;
      }

      if (ropeHandleRef.current) {
        ropeHandleRef.current.style.top = `${ropeTop + newHeight}px`;
        ropeHandleRef.current.style.transform = `translateX(-50%) rotate(${swingAngleRef.current}deg)`;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Drag listeners
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    hasTriggeredRef.current = false;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const currentY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const delta = currentY - startYRef.current;
      pullRef.current = Math.max(0, Math.min(120, delta));

      if (pullRef.current > 55 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        toggleLamp();
      }
    };

    const onEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage(''); setIsLoading(true);
    try {
      let res: any;
      if (mfaStage === 'credentials') {
        if (!username.trim() || !password.trim()) throw new Error('Username dan password wajib diisi.');
        res = await api.adminLogin(username.trim(), password.trim());
        if (res.mfaSetupRequired) {
          setSetupToken(res.setupToken);
          const setup = await api.setupAdminMfa(res.setupToken);
          setSetupSecret(setup.secret); setMfaStage('setup');
          onShowToast('info', 'Aktifkan MFA dengan aplikasi authenticator, lalu masukkan kode 6 digit.');
          return;
        }
        if (res.mfaRequired) { setChallengeToken(res.challengeToken); setMfaStage('verify'); return; }
      } else if (mfaStage === 'setup') {
        res = await api.confirmAdminMfa(setupToken, mfaCode);
      } else {
        res = await api.verifyAdminMfa(challengeToken, mfaCode);
      }
      if (res?.success && res?.token && res?.admin) {
        authStorage.setAdminToken(res.token); onLoginSuccess(res.admin);
        onShowToast('success', `Berhasil masuk ke Dashboard Admin sebagai ${res.admin.name}`);
      } else throw new Error(res?.message || 'Verifikasi administrator gagal.');
    } catch (err: any) { setErrorMessage(err.message || 'Login gagal. Periksa kredensial dan kode authenticator.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col justify-between relative overflow-hidden p-4 sm:p-6 transition-colors duration-700 ${
      lampOn ? 'bg-[#121217]' : 'bg-[#0a0a0d]'
    }`}>
      {/* Dynamic warm light rays when lamp is on */}
      {lampOn && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background:
              'radial-gradient(circle at 35% 42%, rgba(255, 215, 0, 0.16) 0%, rgba(245, 158, 11, 0.08) 35%, rgba(0, 0, 0, 0) 70%)'
          }}
        />
      )}

      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2 relative z-20">
        <button
          onClick={onBackToStudent}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Kembali ke Bilik Pemilih</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lamp Quick Toggle */}
          <button
            type="button"
            onClick={toggleLamp}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              lampOn
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm shadow-amber-400/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Klik atau Tarik Tali Lampu"
          >
            <Lightbulb className={`w-3.5 h-3.5 ${lampOn ? 'text-amber-400 fill-amber-400' : ''}`} />
            <span className="hidden sm:inline">{lampOn ? 'Lampu: ON (Menyala)' : 'Lampu: OFF (Tarik Tali)'}</span>
          </button>

          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Asisten AI</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline">Panel Admin eOSIS</span>
          </div>
        </div>
      </header>

      {/* Main Lamp Login Container based on reference code */}
      <main className="max-w-4xl mx-auto w-full my-auto py-6 relative z-10 flex items-center justify-center">
        <div className="w-full bg-[#0d0f14] border border-slate-800/80 rounded-[36px] shadow-[0_30px_70px_rgba(0,0,0,0.85)] flex flex-col md:flex-row overflow-hidden min-h-[500px] relative">
          
          {/* =========================================
              LEFT SIDE: INTERACTIVE PULL-ROPE LAMP
              ========================================= */}
          <div className="w-full md:w-1/2 bg-[#171a23] relative flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800/80 select-none overflow-hidden min-h-[380px] md:min-h-[500px]">
            {/* Ambient lamp glow backdrop */}
            {lampOn && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 35%, rgba(255, 215, 0, 0.28) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 75%)'
                }}
              />
            )}

            {/* Instruction Banner at top of lamp */}
            <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-xs text-slate-400 z-10">
              <span className="font-heading font-bold text-slate-300 flex items-center gap-1.5">
                <Lightbulb className={`w-3.5 h-3.5 ${lampOn ? 'text-amber-400' : 'text-slate-500'}`} />
                Lampu Meja Kerja Admin
              </span>
              <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Tarik Tali ⬇
              </span>
            </div>

            {/* Lamp Container */}
            <div className={`relative w-[220px] h-[340px] flex flex-col items-center justify-center transition-all ${
              lampOn ? 'lamp-on' : ''
            }`}>
              {/* Lamp Shade (Kap Lampu) */}
              <div
                onClick={toggleLamp}
                className="cursor-pointer transition-all duration-300"
                style={{
                  width: '180px',
                  height: '65px',
                  background: lampOn
                    ? 'linear-gradient(145deg, #ffd966, #e6b422)'
                    : 'linear-gradient(145deg, #4b5563, #1f2937)',
                  borderRadius: '160px 160px 35px 35px',
                  position: 'absolute',
                  top: '45px',
                  border: lampOn ? '2px solid #f59e0b' : '2px solid #374151',
                  boxShadow: lampOn
                    ? '0 0 100px rgba(255, 215, 0, 0.9), 0 0 45px rgba(255, 215, 0, 0.7), 0 15px 30px rgba(0,0,0,0.7)'
                    : '0 8px 16px rgba(0,0,0,0.5)',
                  zIndex: 12
                }}
                title="Klik untuk menyalakan/mematikan"
              >
                {/* Light bulb inner glow filament hint */}
                {lampOn && (
                  <div className="absolute inset-x-8 bottom-0 h-4 bg-white/70 blur-[4px] rounded-full mx-auto" />
                )}
              </div>

              {/* Lamp Pole (Tiang Lampu) */}
              <div
                style={{
                  width: '22px',
                  height: '165px',
                  background: 'linear-gradient(170deg, #64748b, #334155)',
                  position: 'absolute',
                  top: '95px',
                  borderRadius: '16px 16px 4px 4px',
                  boxShadow: '0 10px 15px rgba(0, 0, 0, 0.6)',
                  zIndex: 1
                }}
              />

              {/* Lamp Base (Pijakan Lampu) */}
              <div
                style={{
                  width: '95px',
                  height: '26px',
                  background: 'linear-gradient(145deg, #475569, #1e293b)',
                  borderRadius: '50px 50px 16px 16px',
                  position: 'absolute',
                  bottom: '30px',
                  boxShadow: '0 10px 22px rgba(0, 0, 0, 0.6)',
                  borderBottom: '3px solid #64748b',
                  zIndex: 2
                }}
              />

              {/* Pull Rope (Tali Tarik) */}
              <div
                ref={pullRopeRef}
                style={{
                  position: 'absolute',
                  top: '105px',
                  left: '145px',
                  width: '2.5px',
                  height: '75px',
                  background: 'linear-gradient(90deg, #b45309, #f59e0b)',
                  zIndex: 10,
                  transformOrigin: 'top center',
                  borderRadius: '6px'
                }}
              />

              {/* Rope Handle (Pegangan Tali Emas yang ditarik) */}
              <div
                ref={ropeHandleRef}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                onClick={toggleLamp}
                className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                style={{
                  position: 'absolute',
                  top: '180px',
                  left: '146px',
                  transform: 'translateX(-50%)',
                  width: '18px',
                  height: '18px',
                  background: 'radial-gradient(circle at 35% 35%, #fef08a, #d97706)',
                  borderRadius: '50%',
                  zIndex: 15,
                  boxShadow: lampOn
                    ? '0 0 14px rgba(245, 158, 11, 0.9), 0 3px 0 #78350f, 0 8px 14px rgba(0,0,0,0.8)'
                    : '0 3px 0 #78350f, 0 6px 12px rgba(0,0,0,0.7)',
                  border: '2px solid #fef08a'
                }}
                title="Tarik ke bawah atau klik untuk saklar lampu"
              >
                {/* Tiny arrow indicator under handle */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '8px',
                    color: lampOn ? '#fbbf24' : '#94a3b8',
                    lineHeight: 1
                  }}
                >
                  ▼
                </span>
              </div>
            </div>

            {/* Hint message below lamp */}
            <div className="text-center mt-auto pt-2 z-10">
              <p className="text-xs text-slate-300 font-medium">
                {lampOn ? (
                  <span className="text-amber-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    Lampu Aktif &bull; Formulir Login Terbuka
                  </span>
                ) : (
                  <span className="text-slate-400 animate-pulse flex items-center justify-center gap-1.5">
                    <span>💡 Tarik tali lampu untuk menyalakan form login</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* =========================================
              RIGHT SIDE: LOGIN FORM (Slides in/out based on lamp)
              ========================================= */}
          <div className="w-full md:w-1/2 bg-[#0f1118] p-6 sm:p-9 flex items-center justify-center relative overflow-hidden">
            {/* Ambient lamp cast on right side */}
            {lampOn && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at -20% 50%, rgba(255, 215, 0, 0.12) 0%, transparent 60%)'
                }}
              />
            )}

            {/* Login Form Box with spring sliding animation */}
            <div
              className={`w-full max-w-sm rounded-3xl p-6 sm:p-7 border transition-all duration-500 relative z-10 ${
                lampOn
                  ? 'translate-x-0 opacity-100 bg-[#161923]/95 border-slate-700/80 shadow-2xl'
                  : 'translate-x-24 opacity-0 pointer-events-none bg-transparent border-transparent'
              }`}
            >
              {/* Form Title & Subheading */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20 mb-2.5 p-1.5">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-heading">
                  WELCOME ADMIN
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Panel Administrator eOSIS {settings.schoolName}
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
                  <span className="font-bold text-rose-400 shrink-0">&bull;</span>
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleLogin} className="space-y-4">
                {mfaStage === 'credentials' && <>
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full pl-10 pr-4 py-3 bg-[#11131c] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Password with Eye Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      className="w-full pl-10 pr-10 py-3 bg-[#11131c] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono tracking-wider"
                      required
                    />
                  </div>
                </div>

                </>}
                {mfaStage !== 'credentials' && <div className="space-y-3">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {mfaStage === 'setup' ? 'Pindai QR atau masukkan kunci ini secara manual pada aplikasi authenticator (Google Authenticator, Microsoft Authenticator, atau Authy).' : 'Masukkan kode 6 digit dari aplikasi authenticator untuk melanjutkan.'}
                  </div>
                  {mfaStage === 'setup' && <div className="rounded-lg bg-slate-900 border border-amber-500/40 p-3 text-center"><div className="text-[10px] text-slate-400 mb-1">KUNCI SETUP MFA — SIMPAN RAHASIA</div><code className="text-amber-300 text-sm break-all select-all">{setupSecret}</code></div>}
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" className="w-full text-center tracking-[0.5em] text-xl py-3 bg-[#11131c] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>}
                {/* Sign in Button matching the pink/rose theme in original code */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-[0_6px_0_#9f1239] hover:shadow-[0_4px_0_#9f1239] active:shadow-[0_1px_0_#9f1239] active:translate-y-[5px] transition-all flex items-center justify-center gap-2 mt-5 disabled:opacity-70 cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>{mfaStage === 'setup' ? 'Aktifkan MFA & Masuk' : mfaStage === 'verify' ? 'Verifikasi & Masuk' : 'Sign in'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                {mfaStage !== 'credentials' && <button type="button" onClick={()=>{setMfaStage('credentials');setMfaCode('');setSetupSecret('');setErrorMessage('');}} className="w-full text-xs text-slate-400 hover:text-white">Kembali ke login</button>}
              </form>

            </div>

            {/* Placeholder message when lamp is turned off */}
            {!lampOn && (
              <div className="text-center p-6 text-slate-500 animate-in fade-in">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400 font-heading">
                  Lampu Sedang Padam
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Tarik tali lampu di sebelah kiri atau klik tombol saklar untuk membuka formulir login administrator.
                </p>
                <button
                  type="button"
                  onClick={toggleLamp}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  Nyalakan Lampu Sekarang 💡
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3 relative z-10">
        &copy; {new Date().getFullYear()} {settings.schoolName}. eOSIS Lamp Login Administrator Panel.
      </footer>

      {/* Voice Transcriber Modal */}
      <AudioVoiceTranscriberModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        title="Dikte Suara Login Admin"
        description="Bicaralah melalui mikrofon untuk mendiktekan username atau pertanyaan admin."
        onApplyText={(text) => {
          setUsername(text.replace(/\s+/g, '').toLowerCase());
          onShowToast('info', `Username diisi dari suara: ${text}`);
        }}
      />
    </div>
  );
};
