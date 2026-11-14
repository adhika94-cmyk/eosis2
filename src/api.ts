import {
  SchoolSettings,
  StudentSession,
  StaffSession,
  AdminSession,
  Candidate,
  ClassItem,
  StudentRecord,
  StaffRecord,
  AdminStats,
  VoteResults,
  QuickCountData
} from './types.ts';

const STUDENT_TOKEN_KEY = 'eosis_student_token';
const STAFF_TOKEN_KEY = 'eosis_staff_token';
const ADMIN_TOKEN_KEY = 'eosis_admin_token';

export const authStorage = {
  getStudentToken: () => localStorage.getItem(STUDENT_TOKEN_KEY),
  setStudentToken: (token: string) => localStorage.setItem(STUDENT_TOKEN_KEY, token),
  removeStudentToken: () => localStorage.removeItem(STUDENT_TOKEN_KEY),

  getStaffToken: () => localStorage.getItem(STAFF_TOKEN_KEY),
  setStaffToken: (token: string) => localStorage.setItem(STAFF_TOKEN_KEY, token),
  removeStaffToken: () => localStorage.removeItem(STAFF_TOKEN_KEY),

  getAdminToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setAdminToken: (token: string) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  removeAdminToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY)
};

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const targetUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const response = await fetch(targetUrl, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const api = {
  // Public
  getPublicInfo: () =>
    fetchJson<{
      settings: SchoolSettings;
      candidates: Candidate[];
      stats: {
        totalStudents: number;
        votedStudents: number;
        totalStaff: number;
        votedStaff: number;
        totalVoters: number;
        totalVoted: number;
        participationRate: string;
      };
    }>('/api/public/info'),

  getQuickCount: () => fetchJson<QuickCountData>('/api/public/quick-count'),

  getNetworkInfo: () =>
    fetchJson<{
      success: boolean;
      port: number;
      hostname: string;
      currentOrigin: string;
      addresses: Array<{ name: string; address: string; family: string; url: string }>;
      recommendedUrl: string;
      firewallWindowsCmd: string;
    }>('/api/public/network-info'),

  // Student Auth
  studentLogin: (code: string) =>
    fetchJson<{ success: boolean; token: string; student: StudentSession }>('/api/student/login', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),

  getStudentMe: (token?: string) => {
    const t = token || authStorage.getStudentToken();
    return fetchJson<{ success: boolean; student: StudentSession }>('/api/student/me', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  castVote: (candidateId: string, token?: string) => {
    const t = token || authStorage.getStudentToken();
    return fetchJson<{ success: boolean; message: string }>('/api/student/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({ candidateId })
    });
  },

  // Staff / Guru Auth (User NIP + Password Tahun Lahir)
  staffLogin: (code: string) =>
    fetchJson<{ success: boolean; token: string; staff: StaffSession }>('/api/staff/login', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),

  getStaffMe: (token?: string) => {
    const t = token || authStorage.getStaffToken();
    return fetchJson<{ success: boolean; staff: StaffSession }>('/api/staff/me', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  castStaffVote: (candidateId: string, token?: string) => {
    const t = token || authStorage.getStaffToken();
    return fetchJson<{ success: boolean; message: string }>('/api/staff/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({ candidateId })
    });
  },

  // Admin-issued voter credentials and security audit
  generateVoterCodes: (voterType: 'student' | 'staff', token?: string) => fetchJson<any>('/api/admin/voter-codes/generate', { method: 'POST', headers: { Authorization: `Bearer ${token || authStorage.getAdminToken()}` }, body: JSON.stringify({ voterType }) }),
  getSecurityAudit: (token?: string) => fetchJson<any>('/api/admin/security-audit', { headers: { Authorization: `Bearer ${token || authStorage.getAdminToken()}` } }),

  // Admin Auth
  adminLogin: (username: string, password: string) =>
    fetchJson<any>('/api/admin/login', { method:'POST', body:JSON.stringify({ username, password }) }),
  setupAdminMfa: (setupToken: string) => fetchJson<any>('/api/admin/mfa/setup', { method:'POST', body:JSON.stringify({ setupToken }) }),
  confirmAdminMfa: (setupToken: string, code: string) => fetchJson<any>('/api/admin/mfa/confirm', { method:'POST', body:JSON.stringify({ setupToken, code }) }),
  verifyAdminMfa: (challengeToken: string, code: string) => fetchJson<any>('/api/admin/login/verify', { method:'POST', body:JSON.stringify({ challengeToken, code }) }),
  getAdminAccounts: (token?: string) => fetchJson<any>('/api/admin/accounts', { headers:{ Authorization:`Bearer ${token || authStorage.getAdminToken()}` } }),
  createAdminAccount: (payload: any, token?: string) => fetchJson<any>('/api/admin/accounts', { method:'POST', headers:{ Authorization:`Bearer ${token || authStorage.getAdminToken()}` }, body:JSON.stringify(payload) }),
  getAdminApprovals: (token?: string) => fetchJson<any>('/api/admin/approvals', { headers:{ Authorization:`Bearer ${token || authStorage.getAdminToken()}` } }),
  requestAdminApproval: (action: string, reason: string, token?: string) => fetchJson<any>('/api/admin/approvals', { method:'POST', headers:{ Authorization:`Bearer ${token || authStorage.getAdminToken()}` }, body:JSON.stringify({ action, reason }) }),
  approveAdminApproval: (id: string, token?: string) => fetchJson<any>(`/api/admin/approvals/${id}/approve`, { method:'POST', headers:{ Authorization:`Bearer ${token || authStorage.getAdminToken()}` }, body:JSON.stringify({}) }),
  executeAdminApproval: (action: string, approvalId: string, token?: string) => { const paths:Record<string,string>={reset_student_votes:'/api/admin/students/reset-votes',reset_staff_votes:'/api/admin/staff/reset-votes',reset_all_votes:'/api/admin/results/reset-all',reset_database:'/api/admin/reset-database'}; const path=paths[action]; if(!path) throw new Error('Aksi persetujuan tidak dikenal.'); return fetchJson<any>(path,{method:'POST',headers:{Authorization:`Bearer ${token || authStorage.getAdminToken()}`},body:JSON.stringify({approvalId})}); },

  getAdminMe: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; admin: AdminSession }>('/api/admin/me', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Dashboard & Stats
  getAdminStats: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<AdminStats>('/api/admin/stats', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Classes
  getAdminClasses: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<ClassItem[]>('/api/admin/classes', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  createClass: (name: string, grade: number, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; classItem: ClassItem }>('/api/admin/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, grade })
    });
  },

  updateClass: (id: string, name: string, grade: number, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; classItem: ClassItem }>(`/api/admin/classes/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, grade })
    });
  },

  deleteClass: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message?: string }>(`/api/admin/classes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Students
  getAdminStudents: (
    params?: { search?: string; classId?: string; status?: 'all' | 'voted' | 'unvoted' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.classId) query.set('classId', params.classId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return fetchJson<StudentRecord[]>(`/api/admin/students${qs}`, {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  createStudent: (
    student: { nisn: string; name: string; birthDate: string; classId: string; gender: 'L' | 'P' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; student: StudentRecord }>('/api/admin/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(student)
    });
  },

  updateStudent: (
    id: string,
    student: { nisn?: string; name?: string; birthDate?: string; classId?: string; gender?: 'L' | 'P' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; student: StudentRecord }>(`/api/admin/students/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(student)
    });
  },

  deleteStudent: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>(`/api/admin/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetStudentVote: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>(`/api/admin/students/${id}/reset-vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetAllStudentVotes: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; count: number; message: string }>('/api/admin/students/reset-all-votes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  deleteAllStudents: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; count: number; message: string }>('/api/admin/students/delete-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  importBulkStudents: (
    students: Array<{
      nisn: string;
      name: string;
      className: string;
      birthDate?: string;
      gender?: 'L' | 'P';
    }>,
    options?: { autoCreateClass?: boolean; updateExisting?: boolean },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{
      success: boolean;
      totalProcessed: number;
      imported: number;
      updated: number;
      skipped: number;
      newClassesCreated: string[];
      errors: string[];
      message: string;
    }>('/api/admin/students/import-bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        students,
        autoCreateClass: options?.autoCreateClass ?? true,
        updateExisting: options?.updateExisting ?? false
      })
    });
  },

  // Admin Guru & Staff (Teachers & Staff)
  getAdminStaff: (
    params?: { search?: string; status?: 'all' | 'voted' | 'unvoted' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return fetchJson<StaffRecord[]>(`/api/admin/staff${qs}`, {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  createStaff: (
    staff: { nip: string; name: string; birthYear: string; role: string; gender: 'L' | 'P' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; staff: StaffRecord }>('/api/admin/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(staff)
    });
  },

  updateStaff: (
    id: string,
    staff: { nip?: string; name?: string; birthYear?: string; role?: string; gender?: 'L' | 'P' },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; staff: StaffRecord }>(`/api/admin/staff/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(staff)
    });
  },

  deleteStaff: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>(`/api/admin/staff/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetStaffVote: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>(`/api/admin/staff/${id}/reset-vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetAllStaffVotes: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; count: number; message: string }>('/api/admin/staff/reset-all-votes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Candidates
  getAdminCandidates: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<Candidate[]>('/api/admin/candidates', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  createCandidate: (
    candidate: {
      candidateNo: number;
      leaderName: string;
      viceLeaderName: string;
      leaderClass: string;
      viceLeaderClass: string;
      slogan: string;
      vision: string;
      mission: string[];
      photoUrl: string;
    },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; candidate: Candidate }>('/api/admin/candidates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(candidate)
    });
  },

  updateCandidate: (
    id: string,
    candidate: Partial<{
      candidateNo: number;
      leaderName: string;
      viceLeaderName: string;
      leaderClass: string;
      viceLeaderClass: string;
      slogan: string;
      vision: string;
      mission: string[];
      photoUrl: string;
    }>,
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; candidate: Candidate }>(`/api/admin/candidates/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(candidate)
    });
  },

  deleteCandidate: (id: string, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>(`/api/admin/candidates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Results
  getAdminResults: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<VoteResults>('/api/admin/results', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetAllVotes: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>('/api/admin/results/reset-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  resetEntireDatabase: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>('/api/admin/reset-database', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  // Admin Settings
  getAdminSettings: (token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<SchoolSettings>('/api/admin/settings', {
      headers: { Authorization: `Bearer ${t}` }
    });
  },

  updateAdminSettings: (settings: Partial<SchoolSettings>, token?: string) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; settings: SchoolSettings }>('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(settings)
    });
  },

  updateAdminCredentials: (
    data: { currentPassword?: string; newUsername?: string; newPassword?: string; name?: string },
    token?: string
  ) => {
    const t = token || authStorage.getAdminToken();
    return fetchJson<{ success: boolean; message: string }>('/api/admin/credentials', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(data)
    });
  },

  // Upload image
  uploadImage: (fileData: string, fileName?: string) =>
    fetchJson<{ success: boolean; url: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName })
    }),

  // Gemini Audio Transcription (gemini-3.5-transcribe)
  transcribeAudio: (audioData: string, mimeType?: string) =>
    fetchJson<{ success: boolean; text: string; modelUsed: string }>('/api/gemini/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioData, mimeType: mimeType || 'audio/webm' })
    }),

  // Gemini Multi-turn Chatbot (gemini-3.8-flash, gemini-3.1-flash-lite, gemini-4-argon)
  sendChatMessage: (
    messages: Array<{ role: 'user' | 'model'; content: string }>,
    model?: string,
    taskComplexity?: 'general' | 'fast' | 'complex'
  ) =>
    fetchJson<{ success: boolean; text: string; modelUsed: string }>('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, model, taskComplexity })
    })
};

