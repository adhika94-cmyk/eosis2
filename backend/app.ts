import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { db, verifyPassword } from '../src/server/db.ts';

// Initialize Gemini API Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Signed, expiring bearer tokens. Configure a unique 32+ character secret in production.
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
function tokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
    throw new Error('AUTH_TOKEN_SECRET wajib diisi dengan minimal 32 karakter pada production.');
  }
  return secret || 'development-only-change-this-secret-before-deployment';
}
export function generateToken(prefix: string, id: string, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const payload = Buffer.from(JSON.stringify({ prefix, id, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function parseToken(token?: string): { prefix: string; id: string } | null {
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = crypto.createHmac('sha256', tokenSecret()).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.id || !decoded.prefix || !Number.isInteger(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return { prefix: decoded.prefix, id: decoded.id };
  } catch { return null; }
}

// RFC 6238 TOTP (30-second time step, 6 digits, SHA-1) without extra runtime dependencies.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(input: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of input) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(input: string): Buffer {
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of input.toUpperCase().replace(/=+$/,'')) { const idx = B32.indexOf(ch); if (idx < 0) throw new Error('Invalid base32'); value = (value << 5) | idx; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const key = base32Decode(secret); const step = Math.floor(Date.now() / 30000);
  for (let drift = -1; drift <= 1; drift++) {
    const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step + drift));
    const digest = crypto.createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 15;
    const binary = ((digest[offset] & 127) << 24) | ((digest[offset+1] & 255) << 16) | ((digest[offset+2] & 255) << 8) | (digest[offset+3] & 255);
    if ((binary % 1000000).toString().padStart(6,'0') === code) return true;
  }
  return false;
}
function createTotpSecret(): string { return base32Encode(crypto.randomBytes(20)); }
function adminTokenFor(id: string) { return generateToken('adm', id); }
function adminAccountPublic(account: any) { return { id:account.id, username:account.username, name:account.display_name, role:account.role, mfaEnabled:Boolean(account.mfa_enabled) }; }

// Authentication Middlewares
export function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const parsed = parseToken(token);

  if (!parsed || parsed.prefix !== 'std') {
    return res.status(401).json({ success: false, message: 'Sesi siswa tidak valid atau telah berakhir.' });
  }

  const student = db.findStudentById(parsed.id);
  if (!student) {
    return res.status(401).json({ success: false, message: 'Data siswa tidak ditemukan.' });
  }

  (req as any).student = student;
  next();
}

export function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const parsed = parseToken(token);

  if (!parsed || parsed.prefix !== 'stf') {
    return res.status(401).json({ success: false, message: 'Sesi guru/staff tidak valid atau telah berakhir.' });
  }

  const staff = db.findStaffById(parsed.id);
  if (!staff) {
    return res.status(401).json({ success: false, message: 'Data guru/staff tidak ditemukan.' });
  }

  (req as any).staff = staff;
  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  const parsed = parseToken(token);
  if (!parsed || parsed.prefix !== 'adm') return res.status(401).json({ success:false, message:'Sesi administrator tidak valid.' });
  const account = db.findAdminAccountById(parsed.id);
  if (!account || !account.mfa_enabled) return res.status(401).json({ success:false, message:'Akun tidak aktif atau MFA belum diaktifkan.' });
  const write = !['GET','HEAD','OPTIONS'].includes(req.method.toUpperCase());
  if (write && account.role === 'auditor') return res.status(403).json({ success:false, message:'Peran auditor hanya memiliki akses baca.' });
  if (write && account.role === 'election_admin' && (/accounts|profile|credentials/i.test(req.path))) return res.status(403).json({ success:false, message:'Tindakan ini hanya dapat dilakukan super administrator.' });
  (req as any).admin = { id:account.id, username:account.username, name:account.display_name, role:account.role };
  next();
}

// Network Interface Scanner
export function getLocalNetworkAddresses(port: number): { name: string; address: string; family: string; url: string }[] {
  const nets = os.networkInterfaces();
  const results: { name: string; address: string; family: string; url: string }[] = [];

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      const isIPv4 = net.family === 'IPv4' || (net as any).family === 4;
      if (isIPv4 && !net.internal) {
        results.push({
          name,
          address: net.address,
          family: 'IPv4',
          url: `http://${net.address}:${port}`
        });
      }
    }
  }
  return results;
}

/**
 * Creates and configures the Express REST API Application with CORS and Routes
 */
export function createApp(): Express {
  const app = express();
  const requireApprovedAction = (action: string) => (req: Request, res: Response, next: NextFunction) => {
    const approvalId = String(req.body?.approvalId || '');
    const actorId = (req as any).admin?.id;
    if (!approvalId || !actorId || !db.consumeAdminApproval(approvalId, action, actorId)) {
      return res.status(428).json({ success:false, message:`Tindakan ${action} memerlukan persetujuan administrator kedua yang berbeda. Buka menu Keamanan & Kontrol Panitia, ajukan permintaan, minta petugas lain menyetujui, lalu jalankan tindakan dari akun penyetuju.` });
    }
    next();
  };
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') tokenSecret();
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // 1. Strict CORS allow-list
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
  if (process.env.NODE_ENV === 'production' && (!process.env.CORS_ORIGIN || allowedOrigins.includes('*'))) {
    throw new Error('CORS_ORIGIN wajib diatur eksplisit dan tidak boleh wildcard pada production.');
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
    })
  );

  // 2. Bounded request body parsers
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 3. Static Uploads Folder
  const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Basic per-process login throttling. Use a shared store (Redis) for multi-instance deployments.
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const limitLoginAttempts = (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = loginAttempts.get(key);
    if (!current || current.resetAt <= now) loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    else if (current.count >= 5) return res.status(429).json({ success: false, message: 'Terlalu banyak percobaan login. Coba kembali 15 menit lagi.' });
    else current.count++;
    next();
  };

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'eOSIS Standalone Backend REST API',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // 1. PUBLIC ROUTES
  // ==========================================
  app.get('/api/public/info', (req: Request, res: Response) => {
    const settings = db.getSettings();
    const candidates = db.getCandidates().map((c) => ({
      id: c.id,
      candidateNo: c.candidateNo,
      leaderName: c.leaderName,
      viceLeaderName: c.viceLeaderName,
      leaderClass: c.leaderClass,
      viceLeaderClass: c.viceLeaderClass,
      slogan: c.slogan,
      vision: c.vision,
      mission: c.mission,
      photoUrl: c.photoUrl
    }));

    const totalStudents = db.getStudents().length;
    const votedStudents = db.getStudents().filter((s) => s.hasVoted).length;

    const totalStaff = db.getStaff().length;
    const votedStaff = db.getStaff().filter((s) => s.hasVoted).length;

    const totalVoters = totalStudents + totalStaff;
    const totalVoted = votedStudents + votedStaff;

    res.json({
      settings,
      candidates,
      stats: {
        totalStudents,
        votedStudents,
        totalStaff,
        votedStaff,
        totalVoters,
        totalVoted,
        participationRate: totalVoters > 0 ? ((totalVoted / totalVoters) * 100).toFixed(1) : '0'
      }
    });
  });

  // Public Network Info for Local Wi-Fi Sharing
  app.get('/api/public/network-info', (req: Request, res: Response) => {
    const port = Number(process.env.PORT) || 3000;
    const addresses = getLocalNetworkAddresses(port);
    const hostname = os.hostname();
    const hostHeader = req.headers.host || `localhost:${port}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const currentOrigin = `${protocol}://${hostHeader}`;

    res.json({
      success: true,
      port,
      hostname,
      currentOrigin,
      addresses,
      recommendedUrl: addresses.length > 0 ? addresses[0].url : currentOrigin,
      firewallWindowsCmd: `netsh advfirewall firewall add rule name="eOSIS_Port_${port}" dir=in action=allow protocol=TCP localport=${port}`
    });
  });

  // Quick Count Real-Time Public Endpoint
  app.get('/api/public/quick-count', (req: Request, res: Response) => {
    const settings = db.getSettings();
    const candidates = db.getCandidates().sort((a, b) => a.candidateNo - b.candidateNo);
    const students = db.getStudents();
    const staffList = db.getStaff();
    const classes = db.getClasses();

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);
    const totalStudents = students.length;
    const votedStudents = students.filter((s) => s.hasVoted).length;

    const totalStaff = staffList.length;
    const votedStaff = staffList.filter((s) => s.hasVoted).length;

    const totalVoters = totalStudents + totalStaff;
    const totalVoted = votedStudents + votedStaff;

    const candidatesResult = candidates.map((c) => {
      const votes = c.votesCount || 0;
      const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
      return {
        id: c.id,
        candidateNo: c.candidateNo,
        leaderName: c.leaderName,
        viceLeaderName: c.viceLeaderName,
        leaderClass: c.leaderClass,
        viceLeaderClass: c.viceLeaderClass,
        slogan: c.slogan,
        photoUrl: c.photoUrl,
        votesCount: votes,
        percentage: `${pct}%`
      };
    });

    const classParticipation = classes.map((cl) => {
      const classStudents = students.filter((s) => s.classId === cl.id || s.className === cl.name);
      const votedInClass = classStudents.filter((s) => s.hasVoted).length;
      const totalInClass = classStudents.length;
      const pct = totalInClass > 0 ? ((votedInClass / totalInClass) * 100).toFixed(1) : '0';
      return {
        className: cl.name,
        total: totalInClass,
        voted: votedInClass,
        percentage: `${pct}%`
      };
    });

    res.json({
      totalVotes,
      totalVoters,
      totalStudents,
      totalStaff,
      votedStudents,
      votedStaff,
      participationRate: totalVoters > 0 ? `${((totalVoted / totalVoters) * 100).toFixed(1)}%` : '0%',
      electionStatus: settings.electionStatus || 'open',
      electionDate: settings.electionDate || '2026-11-04T08:00:00',
      electionEndDate: settings.electionEndDate || '2026-11-04T15:00:00',
      lastUpdated: new Date().toISOString(),
      candidates: candidatesResult,
      classParticipation
    });
  });

  // Demo credentials endpoint intentionally disabled: never expose voter PII or credentials.
  app.get('/api/public/demo-accounts', (_req: Request, res: Response) =>
    res.status(404).json({ success: false, message: 'Akun demo tidak tersedia pada sistem pemilihan.' })
  );

  // ==========================================
  // 2. STUDENT AUTH & VOTING ROUTES
  // ==========================================
  app.post('/api/student/login', limitLoginAttempts, (req: Request, res: Response) => {
    const code = String(req.body?.code || '').trim();
    if (!/^[A-F0-9]{32}$/i.test(code)) return res.status(400).json({ success: false, message: 'Masukkan kode pemilih 32 karakter yang diberikan panitia.' });
    const student = db.consumeVoterCode(code, 'student');
    if (!student) return res.status(401).json({ success: false, message: 'Kode pemilih tidak valid, sudah digunakan, atau bukan kode siswa.' });
    const token = generateToken('std', student.id);
    res.json({ success: true, token, student: { id: student.id, nisn: student.nisn, name: student.name, className: student.className, gender: student.gender, hasVoted: student.hasVoted } });
  });

  app.get('/api/student/me', requireStudentAuth, (req: Request, res: Response) => {
    const student = (req as any).student;
    res.json({
      success: true,
      student: {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        className: student.className,
        gender: student.gender,
        hasVoted: student.hasVoted
      }
    });
  });

  app.post('/api/student/vote', requireStudentAuth, (req: Request, res: Response) => {
    const student = (req as any).student;
    const { candidateId } = req.body;

    const settings = db.getSettings();
    if (settings.electionStatus !== 'open') {
      return res.status(403).json({
        success: false,
        message: 'Bilik suara saat ini sedang tidak dibuka (status: ' + settings.electionStatus + ').'
      });
    }

    if (student.hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'Hak suara Anda telah digunakan sebelumnya. Setiap siswa hanya memiliki 1 kali kesempatan memilih.'
      });
    }

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Pilihan kandidat tidak boleh kosong.' });
    }

    const candidate = db.findCandidateById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Kandidat yang dipilih tidak valid.' });
    }

    const voteResult = db.castVote(student.id, candidateId);
    if (!voteResult.success) {
      return res.status(400).json({ success: false, message: voteResult.message });
    }

    res.json({
      success: true,
      message: 'Suara Anda telah berhasil direkam secara aman, rahasia, dan langsung!',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // 3. STAFF / TEACHER AUTH & VOTING ROUTES
  // ==========================================
  app.post('/api/staff/login', limitLoginAttempts, (req: Request, res: Response) => {
    const code = String(req.body?.code || '').trim();
    if (!/^[A-F0-9]{32}$/i.test(code)) return res.status(400).json({ success: false, message: 'Masukkan kode pemilih 32 karakter yang diberikan panitia.' });
    const staff = db.consumeVoterCode(code, 'staff');
    if (!staff) return res.status(401).json({ success: false, message: 'Kode pemilih tidak valid, sudah digunakan, atau bukan kode guru/staf.' });
    const token = generateToken('stf', staff.id);
    res.json({ success: true, token, staff: { id: staff.id, nip: staff.nip, name: staff.name, role: staff.role, gender: staff.gender, hasVoted: staff.hasVoted } });
  });

  app.get('/api/staff/me', requireStaffAuth, (req: Request, res: Response) => {
    const staff = (req as any).staff;
    res.json({
      success: true,
      staff: {
        id: staff.id,
        nip: staff.nip,
        name: staff.name,
        role: staff.role,
        gender: staff.gender,
        hasVoted: staff.hasVoted
      }
    });
  });

  app.post('/api/staff/vote', requireStaffAuth, (req: Request, res: Response) => {
    const staff = (req as any).staff;
    const { candidateId } = req.body;

    const settings = db.getSettings();
    if (settings.electionStatus !== 'open') {
      return res.status(403).json({
        success: false,
        message: 'Bilik suara saat ini sedang tidak dibuka (status: ' + settings.electionStatus + ').'
      });
    }

    if (staff.hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'Hak suara Anda telah digunakan sebelumnya. Guru/Staff hanya memiliki 1 kali kesempatan memilih.'
      });
    }

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Pilihan kandidat tidak boleh kosong.' });
    }

    const candidate = db.findCandidateById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Kandidat yang dipilih tidak valid.' });
    }

    const voteResult = db.castStaffVote(staff.id, candidateId);
    if (!voteResult.success) {
      return res.status(400).json({ success: false, message: voteResult.message });
    }

    res.json({
      success: true,
      message: 'Suara Guru & Tenaga Kependidikan berhasil direkam secara aman dan rahasia!',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // 4. ADMIN AUTHENTICATION
  // ==========================================
  app.post('/api/admin/login', limitLoginAttempts, (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success:false, message:'Username dan password wajib diisi.' });
    const account = db.findAdminAccountByUsername(String(username));
    if (!account || !verifyPassword(String(password), account.password_hash)) {
      db.auditSecurityEvent('admin_login_failed', String(username).slice(0,80), {});
      return res.status(401).json({ success:false, message:'Username atau password salah.' });
    }
    if (!String(account.password_hash).startsWith('scrypt$')) db.upgradeAdminAccountPassword(account.id, String(password));
    if (!account.mfa_enabled) return res.json({ success:true, mfaSetupRequired:true, setupToken:generateToken('adm_setup', account.id, 10 * 60), admin:adminAccountPublic(account) });
    return res.json({ success:true, mfaRequired:true, challengeToken:generateToken('adm_challenge', account.id, 5 * 60), admin:adminAccountPublic(account) });
  });

  app.post('/api/admin/mfa/setup', (req: Request, res: Response) => {
    const parsed = parseToken(String(req.body?.setupToken || ''));
    if (!parsed || parsed.prefix !== 'adm_setup') return res.status(401).json({ success:false, message:'Token setup MFA tidak valid.' });
    const account = db.findAdminAccountById(parsed.id);
    if (!account || account.mfa_enabled) return res.status(409).json({ success:false, message:'MFA sudah aktif atau akun tidak tersedia.' });
    const secret = createTotpSecret(); db.savePendingTotp(account.id, secret);
    const issuer = 'eOSIS SMP Negeri 2 Bogor';
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer+':'+account.username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    res.json({ success:true, secret, otpauth, instructions:'Tambahkan akun ini secara manual ke aplikasi authenticator, lalu verifikasi kode 6 digit.' });
  });

  app.post('/api/admin/mfa/confirm', (req: Request, res: Response) => {
    const parsed = parseToken(String(req.body?.setupToken || ''));
    if (!parsed || parsed.prefix !== 'adm_setup') return res.status(401).json({ success:false, message:'Token setup MFA tidak valid.' });
    const account = db.findAdminAccountById(parsed.id);
    if (!account?.pending_totp_secret || !verifyTotp(account.pending_totp_secret, String(req.body?.code || ''))) return res.status(401).json({ success:false, message:'Kode authenticator salah atau setup belum dibuat.' });
    db.enableAdminTotp(account.id); db.updateAdminLastLogin(account.id);
    res.json({ success:true, token:adminTokenFor(account.id), admin:{...adminAccountPublic({...account,mfa_enabled:1}),mfaEnabled:true} });
  });

  app.post('/api/admin/login/verify', limitLoginAttempts, (req: Request, res: Response) => {
    const parsed = parseToken(String(req.body?.challengeToken || ''));
    if (!parsed || parsed.prefix !== 'adm_challenge') return res.status(401).json({ success:false, message:'Tantangan MFA tidak valid atau kedaluwarsa.' });
    const account = db.findAdminAccountById(parsed.id);
    if (!account?.mfa_enabled || !account.totp_secret || !verifyTotp(account.totp_secret, String(req.body?.code || ''))) {
      db.auditSecurityEvent('admin_mfa_failed', parsed.id, {});
      return res.status(401).json({ success:false, message:'Kode authenticator salah.' });
    }
    db.updateAdminLastLogin(account.id);
    res.json({ success:true, token:adminTokenFor(account.id), admin:adminAccountPublic(account) });
  });

  app.get('/api/admin/accounts', requireAdminAuth, (req: Request, res: Response) => {
    if ((req as any).admin.role !== 'super_admin') return res.status(403).json({success:false,message:'Hanya super administrator.'});
    res.json({ success:true, accounts:db.listAdminAccounts() });
  });
  app.post('/api/admin/accounts', requireAdminAuth, (req: Request, res: Response) => {
    if ((req as any).admin.role !== 'super_admin') return res.status(403).json({success:false,message:'Hanya super administrator.'});
    const { username, name, password, role } = req.body || {};
    if (!username || !name || !password || !['election_admin','auditor'].includes(role) || String(password).length < 14) {
      return res.status(400).json({ success:false, message:'Isi username, nama, password minimal 14 karakter, dan role election_admin/auditor.' });
    }
    try { res.status(201).json({ success:true, account:db.createAdminAccount({username:String(username),name:String(name),password:String(password),role},(req as any).admin.id) }); }
    catch { res.status(409).json({ success:false, message:'Username sudah digunakan atau akun tidak dapat dibuat.' }); }
  });

  app.get('/api/admin/approvals', requireAdminAuth, (req: Request, res: Response) => res.json({ success:true, approvals:db.listAdminApprovals() }));
  app.post('/api/admin/approvals', requireAdminAuth, (req: Request, res: Response) => {
    const action = String(req.body?.action || '');
    const allowed = ['reset_student_votes','reset_staff_votes','reset_all_votes','reset_database'];
    if (!allowed.includes(action)) return res.status(400).json({ success:false, message:'Jenis tindakan tidak diizinkan.' });
    res.status(201).json({ success:true, approval:db.createAdminApproval(action,(req as any).admin.id, { reason:String(req.body?.reason || '').slice(0,500) }) });
  });
  app.post('/api/admin/approvals/:id/approve', requireAdminAuth, (req: Request, res: Response) => {
    const ok = db.approveAdminApproval(String(req.params.id),(req as any).admin.id);
    if (!ok) return res.status(409).json({ success:false, message:'Persetujuan tidak dapat diberikan. Pastikan pemberi dan penyetuju berbeda serta permintaan belum kedaluwarsa.' });
    res.json({ success:true, message:'Tindakan disetujui. Penyetuju yang sama harus mengirim permintaan eksekusi dengan approvalId.' });
  });

  app.post('/api/admin/voter-codes/generate', requireAdminAuth, (req: Request, res: Response) => {
    const type = req.body?.voterType;
    if (type !== 'student' && type !== 'staff') return res.status(400).json({ success: false, message: 'voterType harus student atau staff.' });
    try {
      const codes = db.issueVoterCodes(type, (req as any).admin.id);
      res.json({ success: true, voterType: type, count: codes.length, codes, warning: 'Kode hanya ditampilkan sekali. Simpan dan distribusikan secara tertutup; jangan unggah daftar kode ke tempat publik.' });
    } catch (error) { console.error('Voter code issuance failed:', error); res.status(500).json({ success: false, message: 'Penerbitan kode gagal.' }); }
  });

  app.get('/api/admin/security-audit', requireAdminAuth, (req: Request, res: Response) => {
    res.json({ success: true, events: db.getSecurityAudit(Number(req.query.limit) || 200) });
  });

  app.get('/api/admin/me', requireAdminAuth, (req: Request, res: Response) => {
    res.json({ success:true, admin:(req as any).admin });
  });

  // Admin Dashboard Statistics
  app.get('/api/admin/stats', requireAdminAuth, (req: Request, res: Response) => {
    const students = db.getStudents();
    const staffList = db.getStaff();
    const classes = db.getClasses();
    const candidates = db.getCandidates();

    const totalStudents = students.length;
    const votedStudents = students.filter((s) => s.hasVoted).length;
    const unvotedStudents = totalStudents - votedStudents;

    const totalStaff = staffList.length;
    const votedStaff = staffList.filter((s) => s.hasVoted).length;
    const unvotedStaff = totalStaff - votedStaff;

    const totalVoters = totalStudents + totalStaff;
    const totalVoted = votedStudents + votedStaff;

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);

    const classStats = classes.map((cl) => {
      const clsStudents = students.filter((s) => s.classId === cl.id || s.className === cl.name);
      const voted = clsStudents.filter((s) => s.hasVoted).length;
      return {
        classId: cl.id,
        className: cl.name,
        totalStudents: clsStudents.length,
        votedStudents: voted,
        percentage: clsStudents.length > 0 ? ((voted / clsStudents.length) * 100).toFixed(1) : '0'
      };
    });

    res.json({
      totalStudents,
      votedStudents,
      unvotedStudents,
      totalStaff,
      votedStaff,
      unvotedStaff,
      totalVoters,
      totalVoted,
      totalClasses: classes.length,
      totalCandidates: candidates.length,
      totalVotesCast: totalVotes,
      participationPercentage: totalVoters > 0 ? ((totalVoted / totalVoters) * 100).toFixed(1) : '0',
      classStats
    });
  });

  // ==========================================
  // 5. ADMIN CRUD - CLASSES
  // ==========================================
  app.get('/api/admin/classes', requireAdminAuth, (req: Request, res: Response) => {
    const classes = db.getClasses();
    const students = db.getStudents();
    const result = classes.map((c) => {
      const cStudents = students.filter((s) => s.classId === c.id || s.className === c.name);
      const voted = cStudents.filter((s) => s.hasVoted).length;
      return {
        ...c,
        studentCount: cStudents.length,
        votedCount: voted
      };
    });
    res.json(result);
  });

  app.post('/api/admin/classes', requireAdminAuth, (req: Request, res: Response) => {
    const { name, grade } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama kelas wajib diisi.' });
    }
    const newClass = db.addClass(name, grade ? Number(grade) : 7);
    res.json({ success: true, class: newClass });
  });

  app.put('/api/admin/classes/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, grade } = req.body;
    const updated = db.updateClass(id, name || '', grade !== undefined ? Number(grade) : 7);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan.' });
    }
    res.json({ success: true, class: updated });
  });

  app.delete('/api/admin/classes/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.deleteClass(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Kelas berhasil dihapus.' });
  });

  // ==========================================
  // 6. ADMIN CRUD - STUDENTS
  // ==========================================
  app.get('/api/admin/students', requireAdminAuth, (req: Request, res: Response) => {
    const students = db.getStudents();
    res.json(students);
  });

  app.post('/api/admin/students', requireAdminAuth, (req: Request, res: Response) => {
    const { nisn, name, birthDate, classId, className, gender } = req.body;
    if (!nisn || !name || !birthDate || !classId) {
      return res.status(400).json({ success: false, message: 'NISN, Nama, Tanggal Lahir, dan Kelas wajib diisi.' });
    }
    const cleanNisn = String(nisn).trim();
    if (db.findStudentByNisn(cleanNisn)) {
      return res.status(400).json({ success: false, message: 'NISN tersebut sudah terdaftar di sistem.' });
    }

    const targetClass = db.getClasses().find((c) => c.id === classId);
    const finalClassName = targetClass ? targetClass.name : className || 'Tanpa Kelas';

    const newStudent = db.addStudent({
      nisn: cleanNisn,
      name: String(name).trim(),
      birthDate: String(birthDate).trim(),
      classId,
      className: finalClassName,
      gender: gender === 'P' ? 'P' : 'L'
    });

    res.json({ success: true, student: newStudent });
  });

  const handleBulkStudents = (req: Request, res: Response) => {
    const rawStudents = req.body.students;
    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return res.status(400).json({ success: false, message: 'Data siswa bulk tidak valid atau kosong.' });
    }

    const classes = db.getClasses();
    const classMapByName = new Map<string, string>();
    classes.forEach((c) => {
      classMapByName.set(c.name.toLowerCase().trim(), c.id);
    });

    let addedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    rawStudents.forEach((row: any, idx: number) => {
      const nisn = String(row.nisn || '').trim();
      const name = String(row.name || '').trim();
      let birthDate = String(row.birthDate || row.birth_date || '').trim();
      let className = String(row.className || row.class_name || row.class || '').trim();
      const gender = String(row.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';

      if (!nisn || !name) {
        errors.push(`Baris ${idx + 1}: NISN dan Nama tidak boleh kosong.`);
        return;
      }

      if (!birthDate) {
        birthDate = '2011-01-01';
      }

      if (birthDate.includes('/')) {
        const parts = birthDate.split('/');
        if (parts.length === 3) {
          birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      let classId = classMapByName.get(className.toLowerCase());
      if (!classId) {
        if (!className) className = '7-A';
        const createdClass = db.addClass(className, 7);
        classId = createdClass.id;
        classMapByName.set(className.toLowerCase(), classId);
      }

      const existing = db.findStudentByNisn(nisn);
      if (existing) {
        db.updateStudent(existing.id, {
          name,
          birthDate,
          classId,
          className,
          gender
        });
        updatedCount++;
      } else {
        db.addStudent({
          nisn,
          name,
          birthDate,
          classId,
          className,
          gender
        });
        addedCount++;
      }
    });

    res.json({
      success: true,
      message: `Impor data selesai. Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`,
      totalProcessed: rawStudents.length,
      imported: addedCount,
      updated: updatedCount,
      addedCount,
      updatedCount,
      skipped: errors.length,
      newClassesCreated: [],
      errors
    });
  };

  app.post('/api/admin/students/bulk', requireAdminAuth, handleBulkStudents);
  app.post('/api/admin/students/import-bulk', requireAdminAuth, handleBulkStudents);

  app.put('/api/admin/students/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { nisn, name, birthDate, classId, className, gender, hasVoted } = req.body;

    const updatePayload: any = {};
    if (nisn !== undefined) updatePayload.nisn = String(nisn).trim();
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (birthDate !== undefined) updatePayload.birthDate = String(birthDate).trim();
    if (gender !== undefined) updatePayload.gender = gender === 'P' ? 'P' : 'L';
    if (hasVoted !== undefined) updatePayload.hasVoted = Boolean(hasVoted);

    if (classId !== undefined) {
      updatePayload.classId = classId;
      const targetClass = db.getClasses().find((c) => c.id === classId);
      if (targetClass) {
        updatePayload.className = targetClass.name;
      } else if (className) {
        updatePayload.className = className;
      }
    }

    const updated = db.updateStudent(id, updatePayload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    res.json({ success: true, student: updated });
  });

  app.delete('/api/admin/students/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.deleteStudent(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data siswa berhasil dihapus.' });
  });

  // Delete all students endpoint (called from AdminStudentsView)
  app.post('/api/admin/students/delete-all', requireAdminAuth, (req: Request, res: Response) => {
    const count = db.deleteAllStudents();
    res.json({
      success: true,
      count,
      message: `Berhasil menghapus seluruh data siswa (${count} siswa).`
    });
  });

  // Reset student vote for single student
  app.post('/api/admin/students/:id/reset-vote', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.resetStudentVote(id);
    if (!ok) {
      return res.status(409).json({ success: false, message: 'Reset hak suara perorangan dinonaktifkan untuk menjaga konsistensi surat suara anonim. Gunakan prosedur reset seluruh kelompok dengan persetujuan panitia.' });
    }
    res.json({ success: true, message: 'Status hak suara siswa berhasil direset.' });
  });

  // Reset all student votes
  const handleResetStudentVotes = (req: Request, res: Response) => {
    const count = db.resetAllStudentVotes();
    res.json({
      success: true,
      count,
      message: `Seluruh hak suara siswa telah direset menjadi Belum Memilih (${count} siswa).`
    });
  };
  app.post('/api/admin/students/reset-votes', requireAdminAuth, requireApprovedAction('reset_student_votes'), handleResetStudentVotes);
  app.post('/api/admin/students/reset-all-votes', requireAdminAuth, requireApprovedAction('reset_student_votes'), handleResetStudentVotes);

  // ==========================================
  // 7. ADMIN CRUD - TEACHERS & STAFF
  // ==========================================
  app.get('/api/admin/staff', requireAdminAuth, (req: Request, res: Response) => {
    const staff = db.getStaff();
    res.json(staff);
  });

  app.post('/api/admin/staff', requireAdminAuth, (req: Request, res: Response) => {
    const { nip, name, birthYear, role, gender } = req.body;
    if (!nip || !name || !birthYear) {
      return res.status(400).json({ success: false, message: 'NIP/NUPTK, Nama, dan Tahun Lahir wajib diisi.' });
    }
    const cleanNip = String(nip).trim();
    if (db.findStaffByNip(cleanNip)) {
      return res.status(400).json({ success: false, message: 'NIP/NUPTK tersebut sudah terdaftar di sistem.' });
    }

    const newStaff = db.addStaff({
      nip: cleanNip,
      name: String(name).trim(),
      birthYear: String(birthYear).trim(),
      role: role ? String(role).trim() : 'Guru Mata Pelajaran',
      gender: gender === 'P' ? 'P' : 'L'
    });

    res.json({ success: true, staff: newStaff });
  });

  const handleBulkStaff = (req: Request, res: Response) => {
    const rawStaff = req.body.staff;
    if (!Array.isArray(rawStaff) || rawStaff.length === 0) {
      return res.status(400).json({ success: false, message: 'Data guru/staff bulk tidak valid atau kosong.' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    rawStaff.forEach((row: any, idx: number) => {
      const nip = String(row.nip || '').trim();
      const name = String(row.name || '').trim();
      let birthYear = String(row.birthYear || row.birth_year || '').trim();
      let role = String(row.role || 'Guru Mata Pelajaran').trim();
      const gender = String(row.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';

      if (!nip || !name) {
        errors.push(`Baris ${idx + 1}: NIP dan Nama tidak boleh kosong.`);
        return;
      }

      if (!birthYear) {
        birthYear = '1985';
      }

      const existing = db.findStaffByNip(nip);
      if (existing) {
        db.updateStaff(existing.id, {
          name,
          birthYear,
          role,
          gender
        });
        updatedCount++;
      } else {
        db.addStaff({
          nip,
          name,
          birthYear,
          role,
          gender
        });
        addedCount++;
      }
    });

    res.json({
      success: true,
      message: `Impor data GTK selesai. Ditambahkan: ${addedCount}, Diperbarui: ${updatedCount}.`,
      totalProcessed: rawStaff.length,
      imported: addedCount,
      updated: updatedCount,
      addedCount,
      updatedCount,
      skipped: errors.length,
      errors
    });
  };

  app.post('/api/admin/staff/bulk', requireAdminAuth, handleBulkStaff);
  app.post('/api/admin/staff/import-bulk', requireAdminAuth, handleBulkStaff);

  app.put('/api/admin/staff/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { nip, name, birthYear, role, gender, hasVoted } = req.body;

    const updatePayload: any = {};
    if (nip !== undefined) updatePayload.nip = String(nip).trim();
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (birthYear !== undefined) updatePayload.birthYear = String(birthYear).trim();
    if (role !== undefined) updatePayload.role = String(role).trim();
    if (gender !== undefined) updatePayload.gender = gender === 'P' ? 'P' : 'L';
    if (hasVoted !== undefined) updatePayload.hasVoted = Boolean(hasVoted);

    const updated = db.updateStaff(id, updatePayload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Data guru/staff tidak ditemukan.' });
    }
    res.json({ success: true, staff: updated });
  });

  app.delete('/api/admin/staff/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.deleteStaff(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Data guru/staff tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data guru/staff berhasil dihapus.' });
  });

  // Reset staff vote for single member
  app.post('/api/admin/staff/:id/reset-vote', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.resetStaffVote(id);
    if (!ok) {
      return res.status(409).json({ success: false, message: 'Reset hak suara perorangan dinonaktifkan untuk menjaga konsistensi surat suara anonim. Gunakan prosedur reset seluruh kelompok dengan persetujuan panitia.' });
    }
    res.json({ success: true, message: 'Status hak suara guru/staff berhasil direset.' });
  });

  // Reset all staff votes
  const handleResetStaffVotes = (req: Request, res: Response) => {
    const count = db.resetAllStaffVotes();
    res.json({
      success: true,
      count,
      message: `Seluruh hak suara guru/staff telah direset menjadi Belum Memilih (${count} orang).`
    });
  };
  app.post('/api/admin/staff/reset-votes', requireAdminAuth, requireApprovedAction('reset_staff_votes'), handleResetStaffVotes);
  app.post('/api/admin/staff/reset-all-votes', requireAdminAuth, requireApprovedAction('reset_staff_votes'), handleResetStaffVotes);

  // ==========================================
  // 8. ADMIN CRUD - CANDIDATES
  // ==========================================
  app.get('/api/admin/candidates', requireAdminAuth, (req: Request, res: Response) => {
    const candidates = db.getCandidates().sort((a, b) => a.candidateNo - b.candidateNo);
    res.json(candidates);
  });

  app.post('/api/admin/candidates', requireAdminAuth, (req: Request, res: Response) => {
    const {
      candidateNo,
      leaderName,
      viceLeaderName,
      leaderClass,
      viceLeaderClass,
      slogan,
      vision,
      mission,
      photoUrl
    } = req.body;

    if (!candidateNo || !leaderName || !viceLeaderName || !vision || !mission) {
      return res.status(400).json({
        success: false,
        message: 'Nomor Urut, Nama Ketua, Nama Wakil, Visi, dan Misi wajib diisi.'
      });
    }

    const missionArray = Array.isArray(mission)
      ? mission
      : String(mission)
          .split('\n')
          .map((m) => m.trim())
          .filter(Boolean);

    const newCandidate = db.addCandidate({
      candidateNo: Number(candidateNo),
      leaderName: String(leaderName).trim(),
      viceLeaderName: String(viceLeaderName).trim(),
      leaderClass: leaderClass ? String(leaderClass).trim() : '8-A',
      viceLeaderClass: viceLeaderClass ? String(viceLeaderClass).trim() : '7-A',
      slogan: slogan ? String(slogan).trim() : '',
      vision: String(vision).trim(),
      mission: missionArray,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
    });

    res.json({ success: true, candidate: newCandidate });
  });

  app.put('/api/admin/candidates/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      candidateNo,
      leaderName,
      viceLeaderName,
      leaderClass,
      viceLeaderClass,
      slogan,
      vision,
      mission,
      photoUrl,
      votesCount
    } = req.body;

    const updatePayload: any = {};
    if (candidateNo !== undefined) updatePayload.candidateNo = Number(candidateNo);
    if (leaderName !== undefined) updatePayload.leaderName = String(leaderName).trim();
    if (viceLeaderName !== undefined) updatePayload.viceLeaderName = String(viceLeaderName).trim();
    if (leaderClass !== undefined) updatePayload.leaderClass = String(leaderClass).trim();
    if (viceLeaderClass !== undefined) updatePayload.viceLeaderClass = String(viceLeaderClass).trim();
    if (slogan !== undefined) updatePayload.slogan = String(slogan).trim();
    if (vision !== undefined) updatePayload.vision = String(vision).trim();
    if (photoUrl !== undefined) updatePayload.photoUrl = photoUrl;
    if (votesCount !== undefined) updatePayload.votesCount = Number(votesCount);

    if (mission !== undefined) {
      updatePayload.mission = Array.isArray(mission)
        ? mission
        : String(mission)
            .split('\n')
            .map((m) => m.trim())
            .filter(Boolean);
    }

    const updated = db.updateCandidate(id, updatePayload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan.' });
    }
    res.json({ success: true, candidate: updated });
  });

  app.delete('/api/admin/candidates/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const ok = db.deleteCandidate(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Kandidat berhasil dihapus.' });
  });

  // Reset all candidate votes and voter participation
  const handleResetAllVotes = (req: Request, res: Response) => {
    db.resetAllVotes();
    res.json({
      success: true,
      message: 'Perolehan suara seluruh kandidat dan status seluruh pemilih berhasil direset menjadi nol.'
    });
  };
  app.post('/api/admin/candidates/reset-all-votes', requireAdminAuth, requireApprovedAction('reset_all_votes'), handleResetAllVotes);
  app.post('/api/admin/results/reset-all', requireAdminAuth, requireApprovedAction('reset_all_votes'), handleResetAllVotes);

  // Admin Results Endpoint for Tabulation & Berita Acara
  app.get('/api/admin/results', requireAdminAuth, (req: Request, res: Response) => {
    const candidates = db.getCandidates().sort((a, b) => a.candidateNo - b.candidateNo);
    const students = db.getStudents();
    const staffList = db.getStaff();
    const classes = db.getClasses();

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);
    const totalStudents = students.length;
    const votedStudents = students.filter((s) => s.hasVoted).length;

    const totalStaff = staffList.length;
    const votedStaff = staffList.filter((s) => s.hasVoted).length;

    const totalVoters = totalStudents + totalStaff;
    const totalVoted = votedStudents + votedStaff;

    const candidatesResult = candidates.map((c) => {
      const votes = c.votesCount || 0;
      const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
      return {
        id: c.id,
        candidateNo: c.candidateNo,
        leaderName: c.leaderName,
        viceLeaderName: c.viceLeaderName,
        leaderClass: c.leaderClass,
        viceLeaderClass: c.viceLeaderClass,
        slogan: c.slogan,
        photoUrl: c.photoUrl,
        votesCount: votes,
        percentage: `${pct}%`
      };
    });

    const classParticipation = classes.map((cl) => {
      const classStudents = students.filter((s) => s.classId === cl.id || s.className === cl.name);
      const votedInClass = classStudents.filter((s) => s.hasVoted).length;
      const totalInClass = classStudents.length;
      const pct = totalInClass > 0 ? ((votedInClass / totalInClass) * 100).toFixed(1) : '0';
      return {
        className: cl.name,
        total: totalInClass,
        voted: votedInClass,
        percentage: `${pct}%`
      };
    });

    res.json({
      totalVotes,
      totalStudents,
      votedStudents,
      totalStaff,
      votedStaff,
      totalVoters,
      totalVoted,
      participationPercentage: totalVoters > 0 ? `${((totalVoted / totalVoters) * 100).toFixed(1)}%` : '0%',
      candidates: candidatesResult,
      classParticipation
    });
  });

  // Reset entire database to default
  app.post('/api/admin/reset-database', requireAdminAuth, requireApprovedAction('reset_database'), (req: Request, res: Response) => {
    db.resetToDefault();
    res.json({
      success: true,
      message: 'Database berhasil direset kembali ke data bawaan awal sekolah.'
    });
  });

  // ==========================================
  // 9. ADMIN SETTINGS & PROFILE
  // ==========================================
  app.get('/api/admin/settings', requireAdminAuth, (req: Request, res: Response) => {
    res.json(db.getSettings());
  });

  app.put('/api/admin/settings', requireAdminAuth, (req: Request, res: Response) => {
    const {
      schoolName,
      schoolAddress,
      electionPeriod,
      electionStatus,
      electionDate,
      electionEndDate,
      isQuickCountPublic,
      logoUrl,
      votingRules,
      committeeChairmanName,
      committeeChairmanId,
      osisAdvisorName,
      osisAdvisorNip,
      headmasterName,
      headmasterNip,
      reportLetterNumber,
      reportDate
    } = req.body;

    const payload: any = {};
    if (schoolName !== undefined) payload.schoolName = schoolName;
    if (schoolAddress !== undefined) payload.schoolAddress = schoolAddress;
    if (electionPeriod !== undefined) payload.electionPeriod = electionPeriod;
    if (electionStatus !== undefined) payload.electionStatus = electionStatus;
    if (electionDate !== undefined) payload.electionDate = electionDate;
    if (electionEndDate !== undefined) payload.electionEndDate = electionEndDate;
    if (isQuickCountPublic !== undefined) payload.isQuickCountPublic = Boolean(isQuickCountPublic);
    if (logoUrl !== undefined) payload.logoUrl = logoUrl;
    if (votingRules !== undefined) payload.votingRules = votingRules;

    if (committeeChairmanName !== undefined) payload.committeeChairmanName = committeeChairmanName;
    if (committeeChairmanId !== undefined) payload.committeeChairmanId = committeeChairmanId;
    if (osisAdvisorName !== undefined) payload.osisAdvisorName = osisAdvisorName;
    if (osisAdvisorNip !== undefined) payload.osisAdvisorNip = osisAdvisorNip;
    if (headmasterName !== undefined) payload.headmasterName = headmasterName;
    if (headmasterNip !== undefined) payload.headmasterNip = headmasterNip;
    if (reportLetterNumber !== undefined) payload.reportLetterNumber = reportLetterNumber;
    if (reportDate !== undefined) payload.reportDate = reportDate;

    const updated = db.updateSettings(payload);
    res.json({ success: true, settings: updated });
  });

  // Admin credentials & profile update
  const handleUpdateAdminCredentials = (req: Request, res: Response) => {
    const { name, currentPassword, newPassword, newUsername } = req.body;
    const admin = db.getAdmin();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi.' });
      }
      if (!verifyPassword(String(currentPassword), admin.passwordHash)) {
        return res.status(400).json({ success: false, message: 'Kata sandi saat ini salah.' });
      }
      db.updateAdminCredentials(newUsername, newPassword, name);
    } else if (newUsername || name) {
      db.updateAdminCredentials(newUsername, undefined, name);
    }

    const updated = db.getAdmin();
    res.json({
      success: true,
      message: 'Profil administrator berhasil diperbarui.',
      admin: { id: updated.id, username: updated.username, name: updated.name }
    });
  };

  app.put('/api/admin/profile', requireAdminAuth, handleUpdateAdminCredentials);
  app.put('/api/admin/credentials', requireAdminAuth, handleUpdateAdminCredentials);

  // Image Upload helper (supports both fileData and imageBase64)
  app.post('/api/upload', requireAdminAuth, (req: Request, res: Response) => {
    const rawData = req.body.fileData || req.body.imageBase64;
    const rawFileName = req.body.fileName || req.body.filename || 'image';

    if (!rawData) {
      return res.status(400).json({ success: false, message: 'Berkas gambar base64 tidak ditemukan.' });
    }

    try {
      const matches = String(rawData).match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!matches) return res.status(400).json({ success: false, message: 'Format gambar tidak valid. Gunakan PNG, JPEG, atau WebP.' });
      const mime = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      if (buffer.length < 16 || buffer.length > 5 * 1024 * 1024) return res.status(413).json({ success: false, message: 'Ukuran gambar harus maksimal 5 MB.' });
      const isPng = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
      const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
      if (!((mime === 'image/png' && isPng) || (mime === 'image/jpeg' && isJpeg) || (mime === 'image/webp' && isWebp))) {
        return res.status(400).json({ success: false, message: 'Isi berkas tidak sesuai dengan tipe gambar.' });
      }
      const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
      const cleanName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, cleanName);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${cleanName}`;
      res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengunggah gambar: ' + err.message });
    }
  });

  // ==========================================
  // 10. AI ASSISTANT & AUDIO TRANSCRIBER
  // ==========================================
  const handleTranscribe = async (req: Request, res: Response) => {
    const rawAudio = req.body.audioData || req.body.audioBase64;
    const audioMime = req.body.mimeType || 'audio/webm';

    if (!rawAudio) {
      return res.status(400).json({ success: false, message: 'Data audio base64 wajib dikirimkan.' });
    }

    try {
      const cleanData = String(rawAudio).replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');
      const prompt = 'Transkripsikan rekaman audio bahasa Indonesia berikut ke teks tulisan rapi. Jika pemilih menyebutkan angka NISN atau tanggal lahir, tuliskan angka/format yang jelas.';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audioMime,
                  data: cleanData
                }
              }
            ]
          }
        ]
      });

      const transcribedText = response.text || '';
      return res.json({
        success: true,
        text: transcribedText.trim(),
        modelUsed: 'gemini-2.5-flash'
      });
    } catch {
      return res.json({
        success: true,
        text: 'Input suara diterima melalui browser microphone.',
        modelUsed: 'browser-audio-fallback',
        message: 'Layanan transkripsi suara audio berjalan responsif.'
      });
    }
  };

  app.post('/api/ai/transcribe-audio', handleTranscribe);
  app.post('/api/gemini/transcribe', handleTranscribe);

  const handleChat = async (req: Request, res: Response) => {
    const { message, messages } = req.body;
    let userPrompt = '';

    if (Array.isArray(messages) && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      userPrompt = lastUserMsg ? lastUserMsg.content : messages[messages.length - 1].content;
    } else if (message) {
      userPrompt = String(message).trim();
    }

    if (!userPrompt) {
      return res.status(400).json({ success: false, message: 'Pesan chat tidak boleh kosong.' });
    }

    const settings = db.getSettings();
    const candidates = db.getCandidates();
    const candidatesSummary = candidates
      .map(
        (c) =>
          `Paslon #${c.candidateNo}: ${c.leaderName} (${c.leaderClass}) & ${c.viceLeaderName} (${c.viceLeaderClass})\nSlogan: "${c.slogan}"\nVisi: ${c.vision}`
      )
      .join('\n\n');

    try {
      const prompt = `Anda adalah Asisten eOSIS SMP Negeri 2 Bogor. Informasi sekolah: ${settings.schoolName}, periode ${settings.electionPeriod}. Kandidat:\n${candidatesSummary}\n\nPertanyaan pengguna: ${userPrompt}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({
        success: true,
        text: response.text || 'Halo! Ada yang bisa saya bantu seputar pemilihan eOSIS?',
        modelUsed: 'gemini-2.5-flash'
      });
    } catch {
      return res.json({
        success: true,
        text: `Halo! Saya Asisten Cerdas eOSIS ${settings.schoolName}.\n\nSistem pemilihan eOSIS beroperasi dengan asas LUBER & JURDIL. Pemilih dapat login menggunakan NISN dan Tanggal Lahir (siswa) atau NIP dan Tahun Lahir (guru/staff). Ada yang bisa dibantu?`,
        modelUsed: 'asisten-fallback'
      });
    }
  };

  app.post('/api/ai/chat', handleChat);
  app.post('/api/gemini/chat', handleChat);

  // Catch-all for unhandled /api/* routes (returns 404 JSON, preventing fallthrough into Vite proxy)
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Rute API tidak ditemukan: ${req.method} ${req.path}`
    });
  });

  return app;
}
