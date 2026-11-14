import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  initialClasses,
  initialCandidates,
  initialStudents,
  initialStaff,
  initialSettings,
  defaultAdminHash
} from './seedData.ts';
import type { AppDatabase, Student, TeacherStaff, Candidate, ClassItem, SchoolSettings } from './seedData.ts';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'db.json');
const SQLITE_FILE = path.join(DATA_DIR, 'eosis.sqlite');

// Scrypt password hashes are salted and intentionally slow. Legacy SHA-256 hashes
// are accepted only for one-time migration at the next successful admin login.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = storedHash.split('$');
    try {
      const expected = Buffer.from(hashHex, 'hex');
      const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch { return false; }
  }
  // Compatibility for existing installations; caller upgrades after successful verification.
  const legacy = crypto.createHash('sha256').update(String(password).trim()).digest('hex');
  const a = Buffer.from(legacy, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

class DatabaseManager {
  private data: AppDatabase;
  private sqlite: DatabaseSync;

  constructor() {
    if (process.env.NODE_ENV === 'production' && !fs.existsSync(SQLITE_FILE) && !fs.existsSync(LEGACY_DB_FILE) && !process.env.ADMIN_INITIAL_PASSWORD) {
      throw new Error('ADMIN_INITIAL_PASSWORD wajib diisi saat membuat database awal production.');
    }
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    this.sqlite = new DatabaseSync(SQLITE_FILE);
    this.sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;
      CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS voter_participation (voter_key TEXT PRIMARY KEY, voter_type TEXT NOT NULL CHECK(voter_type IN ('student','staff')), voted_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS anonymous_ballots (ballot_id TEXT PRIMARY KEY, voter_type TEXT NOT NULL CHECK(voter_type IN ('student','staff','legacy')), candidate_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_ballots_candidate ON anonymous_ballots(candidate_id);
      CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS voter_codes (code_hash TEXT PRIMARY KEY, voter_type TEXT NOT NULL CHECK(voter_type IN ('student','staff')), voter_id TEXT NOT NULL, created_at TEXT NOT NULL, used_at TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_voter_code_active ON voter_codes(voter_type,voter_id) WHERE used_at IS NULL;
      CREATE TABLE IF NOT EXISTS security_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, actor_id TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('super_admin','election_admin','auditor')), active INTEGER NOT NULL DEFAULT 1, totp_secret TEXT, pending_totp_secret TEXT, mfa_enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_approvals (id TEXT PRIMARY KEY, action TEXT NOT NULL, requested_by TEXT NOT NULL, approved_by TEXT, status TEXT NOT NULL CHECK(status IN ('pending','approved','consumed','rejected','expired')), details_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT);`);
    this.data = this.getDefaultData();
    this.init();
    this.ensureBootstrapAdmin();
  }

  private getDefaultData(): AppDatabase {
    const production = process.env.NODE_ENV === 'production';
    const data: AppDatabase = {
      settings: { ...initialSettings, electionStatus: 'paused', ...(production ? { electionPeriod: '', electionDate: '', electionEndDate: '', committeeChairmanName: '', committeeChairmanId: '', osisAdvisorName: '', osisAdvisorNip: '', headmasterName: '', headmasterNip: '', reportLetterNumber: '', reportDate: '' } : {}) },
      admin: {
        id: 'admin-1',
        username: 'admin',
        passwordHash: process.env.ADMIN_INITIAL_PASSWORD ? hashPassword(process.env.ADMIN_INITIAL_PASSWORD) : defaultAdminHash,
        name: 'Administrator eOSIS'
      },
      classes: production ? [] : [...initialClasses],
      students: production ? [] : initialStudents.map((s) => ({ ...s, hasVoted: false, votedAt: null })),
      staff: production ? [] : initialStaff.map((s) => ({ ...s, hasVoted: false, votedAt: null })),
      candidates: production ? [] : initialCandidates.map((c) => ({ ...c, votesCount: 0 }))
    };
    return data;
  }

  private init() {
    const row = this.sqlite.prepare('SELECT payload FROM app_state WHERE id=1').get() as { payload: string } | undefined;
    if (row?.payload) {
      const parsed = JSON.parse(row.payload);
      if (!parsed.settings || !parsed.admin || !Array.isArray(parsed.students) || !Array.isArray(parsed.candidates)) {
        throw new Error('Struktur database SQLite tidak valid; startup dihentikan.');
      }
      parsed.staff = Array.isArray(parsed.staff) ? parsed.staff : [...initialStaff];
      parsed.classes = Array.isArray(parsed.classes) ? parsed.classes : [...initialClasses];
      parsed.settings = { ...initialSettings, ...parsed.settings };
      this.data = parsed;
      this.refreshVoteCounts();
      return;
    }

    // One-time import from the previous JSON database. Keep the source file intact.
    let imported: AppDatabase | null = null;
    if (fs.existsSync(LEGACY_DB_FILE)) {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LEGACY_JSON_IMPORT !== 'true') {
        throw new Error('db.json lama terdeteksi. Backup dan verifikasi data terlebih dahulu, lalu set ALLOW_LEGACY_JSON_IMPORT=true hanya untuk migrasi satu kali.');
      }
      const parsed = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8'));
      if (parsed?.settings && parsed?.admin && Array.isArray(parsed?.students) && Array.isArray(parsed?.candidates)) {
        parsed.staff = Array.isArray(parsed.staff) ? parsed.staff : [...initialStaff];
        imported = { ...this.getDefaultData(), ...parsed, settings: { ...initialSettings, ...parsed.settings } };
      } else if (process.env.NODE_ENV === 'production') {
        throw new Error('Database JSON lama tidak valid. SQLite tidak dibuat agar data tidak tertimpa.');
      }
    }
    this.data = imported || this.getDefaultData();
    const tx = this.sqlite.prepare('INSERT INTO app_state(id,payload,updated_at) VALUES(1,?,?)');
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      tx.run(JSON.stringify(this.data), new Date().toISOString());
      this.importLegacyParticipationAndTallies();
      this.sqlite.exec('COMMIT');
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
    this.refreshVoteCounts();
    if (process.env.ADMIN_INITIAL_PASSWORD && this.data.admin.passwordHash === defaultAdminHash) {
      this.data.admin.passwordHash = hashPassword(process.env.ADMIN_INITIAL_PASSWORD);
      this.save();
    }
  }

  private importLegacyParticipationAndTallies() {
    const insertParticipation = this.sqlite.prepare('INSERT OR IGNORE INTO voter_participation(voter_key,voter_type,voted_at) VALUES(?,?,?)');
    const insertBallot = this.sqlite.prepare('INSERT INTO anonymous_ballots(ballot_id,voter_type,candidate_id) VALUES(?,?,?)');
    const key = (type: string, id: string) => this.voterKey(type, id);
    for (const student of this.data.students) if (student.hasVoted) insertParticipation.run(key('student', student.nisn), 'student', student.votedAt || new Date().toISOString());
    for (const staff of this.data.staff) if (staff.hasVoted) insertParticipation.run(key('staff', staff.nip), 'staff', staff.votedAt || new Date().toISOString());
    // Preserve historical aggregate totals as anonymous legacy ballots; no voter link is reconstructed.
    for (const candidate of this.data.candidates) {
      const count = Math.max(0, Number(candidate.votesCount) || 0);
      for (let i = 0; i < count; i++) insertBallot.run(crypto.randomUUID(), 'legacy', candidate.id);
    }
  }

  private codeHash(code: string): string {
    const secret = process.env.VOTER_ID_SECRET || 'development-only-voter-secret-change-before-production';
    if (process.env.NODE_ENV === 'production' && secret.length < 32) throw new Error('VOTER_ID_SECRET wajib minimal 32 karakter di production.');
    return crypto.createHmac('sha256', secret).update(`voter-code:${code.trim().toUpperCase()}`).digest('hex');
  }

  public issueVoterCodes(type: 'student' | 'staff', actorId: string) {
    this.refreshStateFromStore();
    const voters = type === 'student' ? this.data.students : this.data.staff;
    const now = new Date().toISOString();
    const issued: Array<{ code: string; name: string; group: string }> = [];
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const remove = this.sqlite.prepare('DELETE FROM voter_codes WHERE voter_type=? AND voter_id=? AND used_at IS NULL');
      const add = this.sqlite.prepare('INSERT INTO voter_codes(code_hash,voter_type,voter_id,created_at,used_at) VALUES(?,?,?,?,NULL)');
      for (const voter of voters) {
        if (voter.hasVoted) continue;
        const code = crypto.randomBytes(16).toString('hex').toUpperCase();
        remove.run(type, voter.id); add.run(this.codeHash(code), type, voter.id, now);
        issued.push({ code, name: voter.name, group: type === 'student' ? (voter as Student).className : (voter as TeacherStaff).role });
      }
      this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run('voter_codes_issued', actorId, JSON.stringify({ voterType: type, count: issued.length }), now);
      this.sqlite.exec('COMMIT'); return issued;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }

  public consumeVoterCode(code: string, type: 'student'): Student | null;
  public consumeVoterCode(code: string, type: 'staff'): TeacherStaff | null;
  public consumeVoterCode(code: string, type: 'student' | 'staff'): Student | TeacherStaff | null {
    const hash = this.codeHash(code); this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const row = this.sqlite.prepare('SELECT voter_id FROM voter_codes WHERE code_hash=? AND voter_type=? AND used_at IS NULL').get(hash, type) as { voter_id: string } | undefined;
      if (!row) { this.sqlite.exec('ROLLBACK'); return null; }
      const result = this.sqlite.prepare('UPDATE voter_codes SET used_at=? WHERE code_hash=? AND used_at IS NULL').run(new Date().toISOString(), hash);
      if (Number(result.changes) !== 1) { this.sqlite.exec('ROLLBACK'); return null; }
      this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run('voter_code_consumed', row.voter_id, JSON.stringify({ voterType: type }), new Date().toISOString());
      this.sqlite.exec('COMMIT'); return type === 'student' ? this.findStudentById(row.voter_id) || null : this.findStaffById(row.voter_id) || null;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }

  public getSecurityAudit(limit = 200) {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    return this.sqlite.prepare('SELECT id,event_type,actor_id,details_json,created_at FROM security_audit ORDER BY id DESC LIMIT ?').all(safeLimit);
  }

  private voterKey(type: string, id: string): string {
    const secret = process.env.VOTER_ID_SECRET || 'development-only-voter-secret-change-before-production';
    if (process.env.NODE_ENV === 'production' && secret.length < 32) throw new Error('VOTER_ID_SECRET wajib minimal 32 karakter di production.');
    return crypto.createHmac('sha256', secret).update(`${type}:${id}`).digest('hex');
  }

  private refreshVoteCounts() {
    const rows = this.sqlite.prepare('SELECT candidate_id, COUNT(*) AS total FROM anonymous_ballots GROUP BY candidate_id').all() as Array<{candidate_id:string; total:number}>;
    const totals = new Map(rows.map((r) => [r.candidate_id, Number(r.total)]));
    for (const candidate of this.data.candidates) candidate.votesCount = totals.get(candidate.id) || 0;
  }

  private refreshStateFromStore() {
    const row = this.sqlite.prepare('SELECT payload FROM app_state WHERE id=1').get() as { payload: string } | undefined;
    if (row?.payload) this.data = JSON.parse(row.payload) as AppDatabase;
    this.refreshVoteCounts();
  }

  public save(): void {
    const statement = this.sqlite.prepare(`INSERT INTO app_state(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`);
    statement.run(JSON.stringify(this.data), new Date().toISOString());
  }

  public resetToDefault(): void {
    this.refreshStateFromStore();
    const next = this.getDefaultData();
    // Keep the currently authenticated super-admin credentials and committee accounts.
    next.admin = this.data.admin;
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      this.sqlite.exec("DELETE FROM voter_participation; DELETE FROM anonymous_ballots; DELETE FROM voter_codes; UPDATE admin_approvals SET status='expired' WHERE status IN ('pending','approved');");
      this.sqlite.prepare('UPDATE app_state SET payload=?, updated_at=? WHERE id=1').run(JSON.stringify(next), new Date().toISOString());
      this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run('database_reset_completed','system',JSON.stringify({preservedAdminAccounts:true}),new Date().toISOString());
      this.sqlite.exec('COMMIT');
      this.data = next;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  // --- Settings ---
  public getSettings(): SchoolSettings {
    this.refreshStateFromStore();
    return this.data.settings;
  }

  public updateSettings(partial: Partial<SchoolSettings>): SchoolSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }

  // --- Admin Auth ---
  private ensureBootstrapAdmin() {
    if (process.env.NODE_ENV === 'production') this.mfaEncryptionKey();
    const count = this.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_accounts').get() as { n: number };
    if (Number(count.n) === 0) {
      const admin = this.getAdmin();
      this.sqlite.prepare(`INSERT INTO admin_accounts(id,username,display_name,password_hash,role,active,mfa_enabled,created_at) VALUES(?,?,?,?, 'super_admin',1,0,?)`)
        .run(admin.id, admin.username, admin.name, admin.passwordHash, new Date().toISOString());
    }
  }

  private mfaEncryptionKey(): Buffer {
    const secret = process.env.ADMIN_MFA_ENCRYPTION_KEY;
    if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) throw new Error('ADMIN_MFA_ENCRYPTION_KEY wajib minimal 32 karakter pada production.');
    return crypto.createHash('sha256').update(secret || 'development-only-mfa-encryption-key-change-me').digest();
  }
  private encryptMfaSecret(secret: string): string {
    const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', this.mfaEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
    return `enc:v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
  }
  private decryptMfaSecret(value: string | null): string | null {
    if (!value) return null;
    const parts = value.split(':'); if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') return value;
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.mfaEncryptionKey(), Buffer.from(parts[2],'base64url'));
    decipher.setAuthTag(Buffer.from(parts[3],'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(parts[4],'base64url')),decipher.final()]).toString('utf8');
  }
  private hydrateAdminAccount(row: any): any {
    if (!row) return null;
    return { ...row, totp_secret:this.decryptMfaSecret(row.totp_secret), pending_totp_secret:this.decryptMfaSecret(row.pending_totp_secret) };
  }
  public findAdminAccountByUsername(username: string): any {
    return this.hydrateAdminAccount(this.sqlite.prepare('SELECT * FROM admin_accounts WHERE username=? AND active=1').get(username.trim()));
  }
  public findAdminAccountById(id: string): any {
    return this.hydrateAdminAccount(this.sqlite.prepare('SELECT * FROM admin_accounts WHERE id=? AND active=1').get(id));
  }
  public listAdminAccounts(): any[] {
    return this.sqlite.prepare('SELECT id,username,display_name AS name,role,active,mfa_enabled AS mfaEnabled,created_at AS createdAt FROM admin_accounts ORDER BY created_at').all() as any[];
  }
  public createAdminAccount(input: { username: string; name: string; password: string; role: 'election_admin'|'auditor' }, actorId: string) {
    const id = `adm-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    this.sqlite.prepare('INSERT INTO admin_accounts(id,username,display_name,password_hash,role,active,mfa_enabled,created_at) VALUES(?,?,?,?,?,1,0,?)')
      .run(id, input.username.trim(), input.name.trim(), hashPassword(input.password), input.role, now);
    this.auditSecurityEvent('admin_account_created', actorId, { accountId: id, role: input.role });
    return { id, username: input.username.trim(), name: input.name.trim(), role: input.role, mfaEnabled: false };
  }
  public savePendingTotp(id: string, secret: string) {
    this.sqlite.prepare('UPDATE admin_accounts SET pending_totp_secret=? WHERE id=? AND active=1').run(this.encryptMfaSecret(secret), id);
  }
  public enableAdminTotp(id: string) {
    this.sqlite.prepare('UPDATE admin_accounts SET totp_secret=pending_totp_secret,pending_totp_secret=NULL,mfa_enabled=1 WHERE id=? AND pending_totp_secret IS NOT NULL').run(id);
    this.auditSecurityEvent('admin_mfa_enabled', id, {});
  }
  public updateAdminLastLogin(id: string) { this.auditSecurityEvent('admin_login_success', id, {}); }
  public upgradeAdminAccountPassword(id: string, password: string) {
    const nextHash = hashPassword(password);
    this.sqlite.prepare('UPDATE admin_accounts SET password_hash=? WHERE id=?').run(nextHash,id);
    if (id === this.data.admin.id) { this.data.admin.passwordHash = nextHash; this.save(); }
  }
  public auditSecurityEvent(event: string, actorId: string, details: unknown) {
    this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run(event, actorId, JSON.stringify(details || {}), new Date().toISOString());
  }
  public createAdminApproval(action: string, requester: string, details: unknown = {}) {
    const id = crypto.randomUUID(); const now = new Date(); const expires = new Date(now.getTime()+15*60*1000).toISOString();
    this.sqlite.prepare(`INSERT INTO admin_approvals(id,action,requested_by,status,details_json,created_at,expires_at) VALUES(?,?,?,'pending',?,?,?)`).run(id, action, requester, JSON.stringify(details || {}), now.toISOString(), expires);
    this.auditSecurityEvent('admin_action_requested', requester, { approvalId:id, action });
    return { id, action, status:'pending', expiresAt:expires };
  }
  public listAdminApprovals() {
    return this.sqlite.prepare(`SELECT id,action,requested_by AS requestedBy,approved_by AS approvedBy,status,details_json AS details,created_at AS createdAt,expires_at AS expiresAt FROM admin_approvals WHERE status IN ('pending','approved') AND expires_at>? ORDER BY created_at`).all(new Date().toISOString()) as any[];
  }
  public approveAdminApproval(id: string, approver: string) {
    const row = this.sqlite.prepare("SELECT * FROM admin_approvals WHERE id=? AND status='pending'").get(id) as any;
    if (!row || row.requested_by === approver || Date.parse(row.expires_at) <= Date.now()) return false;
    const result = this.sqlite.prepare("UPDATE admin_approvals SET status='approved',approved_by=? WHERE id=? AND status='pending'").run(approver,id);
    if (Number(result.changes) !== 1) return false;
    this.auditSecurityEvent('admin_action_approved', approver, { approvalId:id, action:row.action }); return true;
  }
  public consumeAdminApproval(id: string, action: string, actorId: string) {
    const row = this.sqlite.prepare("SELECT * FROM admin_approvals WHERE id=? AND action=? AND status='approved'").get(id,action) as any;
    if (!row || row.requested_by === actorId || row.approved_by !== actorId || Date.parse(row.expires_at) <= Date.now()) return false;
    const result = this.sqlite.prepare("UPDATE admin_approvals SET status='consumed',consumed_at=? WHERE id=? AND status='approved'").run(new Date().toISOString(),id);
    if (Number(result.changes) !== 1) return false;
    this.auditSecurityEvent('admin_action_consumed', actorId, { approvalId:id, action }); return true;
  }

  public getAdmin() {
    this.refreshStateFromStore();
    return this.data.admin;
  }

  public updateAdminCredentials(username?: string, newPassword?: string, name?: string): boolean {
    if (username) this.data.admin.username = username.trim();
    if (name) this.data.admin.name = name.trim();
    if (newPassword && newPassword.trim()) {
      this.data.admin.passwordHash = hashPassword(newPassword.trim());
    }
    this.save();
    this.sqlite.prepare('UPDATE admin_accounts SET username=?,display_name=?,password_hash=? WHERE id=?').run(this.data.admin.username, this.data.admin.name, this.data.admin.passwordHash, this.data.admin.id);
    return true;
  }

  // --- Classes ---
  public getClasses(): ClassItem[] {
    this.refreshStateFromStore();
    return this.data.classes;
  }

  public addClass(name: string, grade: number): ClassItem {
    const newClass: ClassItem = {
      id: 'c-' + Date.now().toString(36),
      name: name.trim(),
      grade: Number(grade)
    };
    this.data.classes.push(newClass);
    this.save();
    return newClass;
  }

  public updateClass(id: string, name: string, grade: number): ClassItem | null {
    const idx = this.data.classes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.classes[idx].name = name.trim();
    this.data.classes[idx].grade = Number(grade);
    for (const s of this.data.students) {
      if (s.classId === id) {
        s.className = name.trim();
      }
    }
    this.save();
    return this.data.classes[idx];
  }

  public deleteClass(id: string): { success: boolean; message?: string } {
    const studentsInClass = this.data.students.filter((s) => s.classId === id);
    if (studentsInClass.length > 0) {
      return { success: false, message: `Tidak dapat menghapus kelas karena masih ada ${studentsInClass.length} siswa di dalamnya.` };
    }
    this.data.classes = this.data.classes.filter((c) => c.id !== id);
    this.save();
    return { success: true };
  }

  // --- Students ---
  public getStudents(): Student[] {
    this.refreshStateFromStore();
    return this.data.students;
  }

  public findStudentByNisn(nisn: string): Student | undefined {
    this.refreshStateFromStore();
    return this.data.students.find((s) => s.nisn.trim() === nisn.trim());
  }

  public findStudentById(id: string): Student | undefined {
    this.refreshStateFromStore();
    return this.data.students.find((s) => s.id === id);
  }

  public addStudent(studentData: Omit<Student, 'id' | 'hasVoted' | 'votedAt'>): { success: boolean; student?: Student; message?: string } {
    const existing = this.findStudentByNisn(studentData.nisn);
    if (existing) {
      return { success: false, message: 'NISN sudah terdaftar dalam sistem.' };
    }

    const cls = this.data.classes.find((c) => c.id === studentData.classId);
    const newStudent: Student = {
      id: 'std-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nisn: studentData.nisn.trim(),
      name: studentData.name.trim(),
      birthDate: studentData.birthDate.trim(),
      classId: studentData.classId,
      className: cls ? cls.name : studentData.className || '-',
      gender: studentData.gender || 'L',
      hasVoted: false,
      votedAt: null
    };

    this.data.students.push(newStudent);
    this.save();
    return { success: true, student: newStudent };
  }

  public updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'hasVoted' | 'votedAt'>>): { success: boolean; student?: Student; message?: string } {
    const idx = this.data.students.findIndex((s) => s.id === id);
    if (idx === -1) return { success: false, message: 'Data siswa tidak ditemukan.' };

    if (updates.nisn && updates.nisn !== this.data.students[idx].nisn) {
      const duplicate = this.findStudentByNisn(updates.nisn);
      if (duplicate && duplicate.id !== id) {
        return { success: false, message: 'NISN baru sudah digunakan oleh siswa lain.' };
      }
    }

    let className = this.data.students[idx].className;
    if (updates.classId) {
      const cls = this.data.classes.find((c) => c.id === updates.classId);
      if (cls) className = cls.name;
    }

    this.data.students[idx] = {
      ...this.data.students[idx],
      ...updates,
      className
    };

    this.save();
    return { success: true, student: this.data.students[idx] };
  }

  public deleteStudent(id: string): boolean {
    const initialLen = this.data.students.length;
    this.data.students = this.data.students.filter((s) => s.id !== id);
    if (this.data.students.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public resetStudentVote(id: string): boolean {
    // Individual reset would re-enable a voter while leaving their anonymous ballot intact.
    return false;
  }

  public deleteAllStudents(): number {
    const count = this.data.students.length;
    this.data.students = [];
    this.save();
    return count;
  }

  public bulkImportStudents(
    items: Array<{
      nisn: string;
      name: string;
      className: string;
      birthDate?: string;
      gender?: string;
    }>,
    options: { autoCreateClass?: boolean; updateExisting?: boolean } = {}
  ): {
    success: boolean;
    totalProcessed: number;
    imported: number;
    updated: number;
    skipped: number;
    newClassesCreated: string[];
    errors: string[];
    message: string;
  } {
    const autoCreateClass = options.autoCreateClass !== false;
    const updateExisting = Boolean(options.updateExisting);

    const classMap = new Map<string, ClassItem>();
    for (const c of this.data.classes) {
      classMap.set(c.name.trim().toLowerCase(), c);
    }

    const studentMap = new Map<string, Student>();
    for (const s of this.data.students) {
      studentMap.set(s.nisn.trim(), s);
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const newClassesCreated: string[] = [];
    const errors: string[] = [];

    // Helper to determine grade from class name (e.g. "7A", "VII-1", "8B", "9.1")
    const detectGrade = (className: string): number => {
      const match = className.match(/^(?:kelas\s*)?(?:vii|viii|ix|7|8|9)/i);
      if (match) {
        const m = match[0].toLowerCase();
        if (m.includes('vii') || m.includes('7')) return 7;
        if (m.includes('viii') || m.includes('8')) return 8;
        if (m.includes('ix') || m.includes('9')) return 9;
      }
      return 7;
    };

    // Helper to normalize birthDate
    const normalizeBirthDate = (raw?: string): string => {
      if (!raw || !raw.trim()) return '2011-01-01';
      const clean = raw.trim();
      // Handle YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      // Handle DD/MM/YYYY or DD-MM-YYYY
      const parts = clean.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      return '2011-01-01';
    };

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rawNisn = String(row.nisn || '').trim().replace(/^['"]|['"]$/g, '');
      const rawName = String(row.name || '').trim();
      const rawClassName = String(row.className || '').trim();

      if (!rawNisn || !rawName) {
        errors.push(`Baris ${i + 1}: NISN atau Nama kosong, dilewati.`);
        skipped++;
        continue;
      }

      // Check or create class
      const classKey = rawClassName ? rawClassName.toLowerCase() : 'umum';
      let classItem = classMap.get(classKey);

      if (!classItem) {
        if (autoCreateClass) {
          const finalClassName = rawClassName || '7A';
          const newClass: ClassItem = {
            id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: finalClassName,
            grade: detectGrade(finalClassName)
          };
          this.data.classes.push(newClass);
          classMap.set(finalClassName.toLowerCase(), newClass);
          newClassesCreated.push(finalClassName);
          classItem = newClass;
        } else {
          classItem = this.data.classes[0] || {
            id: 'default',
            name: '7A',
            grade: 7
          };
        }
      }

      const birthDate = normalizeBirthDate(row.birthDate);
      const gender = (row.gender && String(row.gender).trim().toUpperCase().startsWith('P')) ? 'P' : 'L';

      const existing = studentMap.get(rawNisn);

      if (existing) {
        if (updateExisting) {
          existing.name = rawName;
          existing.classId = classItem.id;
          existing.className = classItem.name;
          existing.birthDate = birthDate;
          existing.gender = gender;
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newStudent: Student = {
          id: 'std-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + i,
          nisn: rawNisn,
          name: rawName,
          birthDate,
          classId: classItem.id,
          className: classItem.name,
          gender,
          hasVoted: false,
          votedAt: null
        };
        this.data.students.push(newStudent);
        studentMap.set(rawNisn, newStudent);
        imported++;
      }
    }

    this.save();

    return {
      success: true,
      totalProcessed: items.length,
      imported,
      updated,
      skipped,
      newClassesCreated,
      errors: errors.slice(0, 10),
      message: `Berhasil mengimpor ${imported} siswa baru` +
        (updated > 0 ? `, memperbarui ${updated} siswa` : '') +
        (skipped > 0 ? `, dan ${skipped} data dilewati (duplikat/invalid)` : '') +
        (newClassesCreated.length > 0 ? `. Dibuat ${newClassesCreated.length} kelas baru otomatis.` : '.')
    };
  }

  // --- Guru & Staff (Teachers & Staff) ---
  public getStaff(): TeacherStaff[] {
    this.refreshStateFromStore();
    if (!this.data.staff) {
      this.data.staff = [...initialStaff];
      this.save();
    }
    return this.data.staff;
  }

  public findStaffByNip(nip: string): TeacherStaff | undefined {
    return this.getStaff().find((s) => s.nip.trim() === nip.trim());
  }

  public findStaffById(id: string): TeacherStaff | undefined {
    this.refreshStateFromStore();
    return this.getStaff().find((s) => s.id === id);
  }

  public addStaff(staffData: Omit<TeacherStaff, 'id' | 'hasVoted' | 'votedAt'>): { success: boolean; staff?: TeacherStaff; message?: string } {
    const existing = this.findStaffByNip(staffData.nip);
    if (existing) {
      return { success: false, message: 'NIP sudah terdaftar dalam sistem.' };
    }

    const newStaff: TeacherStaff = {
      id: 'stf-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nip: staffData.nip.trim(),
      name: staffData.name.trim(),
      birthYear: staffData.birthYear.trim(),
      role: staffData.role.trim() || 'Guru Mata Pelajaran',
      gender: staffData.gender || 'L',
      hasVoted: false,
      votedAt: null
    };

    this.getStaff().push(newStaff);
    this.save();
    return { success: true, staff: newStaff };
  }

  public updateStaff(id: string, updates: Partial<Omit<TeacherStaff, 'id' | 'hasVoted' | 'votedAt'>>): { success: boolean; staff?: TeacherStaff; message?: string } {
    const staffList = this.getStaff();
    const idx = staffList.findIndex((s) => s.id === id);
    if (idx === -1) return { success: false, message: 'Data guru/staff tidak ditemukan.' };

    if (updates.nip && updates.nip !== staffList[idx].nip) {
      const duplicate = this.findStaffByNip(updates.nip);
      if (duplicate && duplicate.id !== id) {
        return { success: false, message: 'NIP baru sudah digunakan oleh guru/staff lain.' };
      }
    }

    staffList[idx] = {
      ...staffList[idx],
      ...updates
    };

    this.save();
    return { success: true, staff: staffList[idx] };
  }

  public deleteStaff(id: string): boolean {
    const staffList = this.getStaff();
    const initialLen = staffList.length;
    this.data.staff = staffList.filter((s) => s.id !== id);
    if (this.data.staff.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public resetStaffVote(id: string): boolean {
    // Individual reset would re-enable a voter while leaving their anonymous ballot intact.
    return false;
  }

  // --- Candidates ---
  public getCandidates(): Candidate[] {
    this.refreshStateFromStore();
    return this.data.candidates;
  }

  public findCandidateById(id: string): Candidate | undefined {
    this.refreshStateFromStore();
    return this.data.candidates.find((c) => c.id === id);
  }

  public addCandidate(data: Omit<Candidate, 'id' | 'votesCount'>): Candidate {
    const newCand: Candidate = {
      id: 'cand-' + Date.now().toString(36),
      candidateNo: Number(data.candidateNo),
      leaderName: data.leaderName.trim(),
      viceLeaderName: data.viceLeaderName.trim(),
      leaderClass: data.leaderClass.trim(),
      viceLeaderClass: data.viceLeaderClass.trim(),
      slogan: data.slogan.trim(),
      vision: data.vision.trim(),
      mission: Array.isArray(data.mission) ? data.mission : [String(data.mission)],
      photoUrl: data.photoUrl || '',
      votesCount: 0
    };
    this.data.candidates.push(newCand);
    this.save();
    return newCand;
  }

  public updateCandidate(id: string, updates: Partial<Omit<Candidate, 'id' | 'votesCount'>>): Candidate | null {
    const idx = this.data.candidates.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.candidates[idx] = {
      ...this.data.candidates[idx],
      ...updates
    };
    this.save();
    return this.data.candidates[idx];
  }

  public deleteCandidate(id: string): boolean {
    const used = this.sqlite.prepare('SELECT 1 AS found FROM anonymous_ballots WHERE candidate_id=? LIMIT 1').get(id);
    if (used) return false;
    const initialLen = this.data.candidates.length;
    this.data.candidates = this.data.candidates.filter((c) => c.id !== id);
    if (this.data.candidates.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // A single SQLite write transaction serializes concurrent votes across processes.
  // Participation and anonymous ballot rows deliberately have no shared identifier.
  private castAnonymousVote(type: 'student' | 'staff', voterId: string, candidateId: string): { success: boolean; message: string } {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const stateRow = this.sqlite.prepare('SELECT payload FROM app_state WHERE id=1').get() as {payload:string};
      const current = JSON.parse(stateRow.payload) as AppDatabase;
      if (current.settings.electionStatus !== 'open') {
        this.sqlite.exec('ROLLBACK');
        return { success: false, message: 'Pemilihan saat ini sedang ditutup atau dijeda oleh panitia.' };
      }
      const voter = type === 'student' ? current.students.find((v) => v.id === voterId) : current.staff.find((v) => v.id === voterId);
      if (!voter) {
        this.sqlite.exec('ROLLBACK');
        return { success: false, message: 'Data pemilih tidak ditemukan.' };
      }
      if (voter.hasVoted) {
        this.sqlite.exec('ROLLBACK');
        return { success: false, message: 'Anda sudah menggunakan hak suara Anda sebelumnya.' };
      }
      const candidate = current.candidates.find((c) => c.id === candidateId);
      if (!candidate) {
        this.sqlite.exec('ROLLBACK');
        return { success: false, message: 'Kandidat yang dipilih tidak valid.' };
      }
      const stableVoterIdentity = type === 'student' ? (voter as any).nisn : (voter as any).nip;
      const voterKey = this.voterKey(type, String(stableVoterIdentity));
      const inserted = this.sqlite.prepare('INSERT OR IGNORE INTO voter_participation(voter_key,voter_type,voted_at) VALUES(?,?,?)').run(voterKey, type, new Date().toISOString());
      if (Number(inserted.changes) !== 1) {
        this.sqlite.exec('ROLLBACK');
        return { success: false, message: 'Anda sudah menggunakan hak suara Anda sebelumnya.' };
      }
      this.sqlite.prepare('INSERT INTO anonymous_ballots(ballot_id,voter_type,candidate_id) VALUES(?,?,?)').run(crypto.randomUUID(), type, candidateId);
      this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run('vote_cast', voterId, JSON.stringify({ voterType: type }), new Date().toISOString());
      this.sqlite.prepare('INSERT INTO security_audit(event_type,actor_id,details_json,created_at) VALUES(?,?,?,?)').run('vote_cast', voterId, JSON.stringify({ voterType: type }), new Date().toISOString());
      voter.hasVoted = true;
      voter.votedAt = new Date().toISOString();
      const totals = this.sqlite.prepare('SELECT candidate_id, COUNT(*) AS total FROM anonymous_ballots GROUP BY candidate_id').all() as Array<{candidate_id:string;total:number}>;
      const map = new Map(totals.map((r) => [r.candidate_id, Number(r.total)]));
      for (const c of current.candidates) c.votesCount = map.get(c.id) || 0;
      this.sqlite.prepare('UPDATE app_state SET payload=?, updated_at=? WHERE id=1').run(JSON.stringify(current), new Date().toISOString());
      this.sqlite.exec('COMMIT');
      this.data = current;
      return { success: true, message: 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi' };
    } catch (error) {
      try { this.sqlite.exec('ROLLBACK'); } catch {}
      console.error('Vote transaction failed:', error);
      return { success: false, message: 'Suara belum tersimpan. Silakan coba kembali dan hubungi panitia bila berulang.' };
    }
  }

  public castVote(studentId: string, candidateId: string) {
    return this.castAnonymousVote('student', studentId, candidateId);
  }

  public castStaffVote(staffId: string, candidateId: string) {
    return this.castAnonymousVote('staff', staffId, candidateId);
  }

  // Group resets are transactional. They remove the anonymous ballots for the
  // selected group and update eligibility state in the same SQLite commit.
  public resetAllStudentVotes(): number {
    this.refreshStateFromStore();
    let count = 0;
    for (const student of this.data.students) {
      if (student.hasVoted) count++;
      student.hasVoted = false;
      student.votedAt = null;
    }
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      this.sqlite.exec("DELETE FROM voter_participation WHERE voter_type='student'; DELETE FROM anonymous_ballots WHERE voter_type='student';");
      this.refreshVoteCounts();
      this.sqlite.prepare('UPDATE app_state SET payload=?, updated_at=? WHERE id=1').run(JSON.stringify(this.data), new Date().toISOString());
      this.sqlite.exec('COMMIT');
      return count;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  public resetAllStaffVotes(): number {
    this.refreshStateFromStore();
    let count = 0;
    for (const staff of this.data.staff) {
      if (staff.hasVoted) count++;
      staff.hasVoted = false;
      staff.votedAt = null;
    }
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      this.sqlite.exec("DELETE FROM voter_participation WHERE voter_type='staff'; DELETE FROM anonymous_ballots WHERE voter_type='staff';");
      this.refreshVoteCounts();
      this.sqlite.prepare('UPDATE app_state SET payload=?, updated_at=? WHERE id=1').run(JSON.stringify(this.data), new Date().toISOString());
      this.sqlite.exec('COMMIT');
      return count;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  public resetAllVotes(): void {
    this.refreshStateFromStore();
    for (const student of this.data.students) { student.hasVoted = false; student.votedAt = null; }
    for (const staff of this.data.staff) { staff.hasVoted = false; staff.votedAt = null; }
    for (const candidate of this.data.candidates) candidate.votesCount = 0;
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      this.sqlite.exec('DELETE FROM voter_participation; DELETE FROM anonymous_ballots;');
      this.sqlite.prepare('UPDATE app_state SET payload=?, updated_at=? WHERE id=1').run(JSON.stringify(this.data), new Date().toISOString());
      this.sqlite.exec('COMMIT');
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

}

export const db = new DatabaseManager();
