export interface SchoolSettings {
  id: string;
  schoolName: string;
  schoolAddress: string;
  electionPeriod: string;
  electionStatus: 'open' | 'paused' | 'closed';
  electionDate?: string;
  electionEndDate?: string;
  isQuickCountPublic?: boolean;
  logoUrl: string;
  votingRules: string;
  committeeChairmanName?: string;
  committeeChairmanId?: string;
  osisAdvisorName?: string;
  osisAdvisorNip?: string;
  headmasterName?: string;
  headmasterNip?: string;
  reportLetterNumber?: string;
  reportDate?: string;
}

export interface QuickCountData {
  totalVotes: number;
  totalVoters: number;
  totalStudents: number;
  totalStaff: number;
  votedStudents: number;
  votedStaff: number;
  participationRate: string;
  electionStatus: 'open' | 'paused' | 'closed';
  electionDate?: string;
  electionEndDate?: string;
  lastUpdated: string;
  candidates: Array<{
    id: string;
    candidateNo: number;
    leaderName: string;
    viceLeaderName: string;
    leaderClass: string;
    viceLeaderClass: string;
    slogan: string;
    photoUrl: string;
    votesCount: number;
    percentage: string;
  }>;
  classParticipation?: Array<{
    className: string;
    total: number;
    voted: number;
    percentage: string;
  }>;
}

export interface StudentSession {
  id: string;
  nisn: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
}

export interface StaffSession {
  id: string;
  nip: string;
  name: string;
  role: string;
  birthYear: string;
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
}

export type AnyVoterSession =
  | ({ voterType: 'student' } & StudentSession)
  | ({ voterType: 'staff' } & StaffSession);

export interface AdminSession {
  id: string;
  username: string;
  name: string;
  role?: 'super_admin' | 'election_admin' | 'auditor';
  mfaEnabled?: boolean;
}

export interface Candidate {
  id: string;
  candidateNo: number;
  leaderName: string;
  viceLeaderName: string;
  leaderClass: string;
  viceLeaderClass: string;
  slogan: string;
  vision: string;
  mission: string[];
  photoUrl: string;
  votesCount?: number;
  percentage?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  grade: number;
  studentCount?: number;
}

export interface StudentRecord {
  id: string;
  nisn: string;
  name: string;
  birthDate: string;
  classId: string;
  className: string;
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
}

export interface StaffRecord {
  id: string;
  nip: string;
  name: string;
  birthYear: string;
  role: string;
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
}

export interface AdminStats {
  totalStudents: number;
  votedStudents: number;
  notVotedStudents: number;
  totalStaff: number;
  votedStaff: number;
  notVotedStaff: number;
  totalVoters: number;
  totalVoted: number;
  totalClasses: number;
  totalCandidates: number;
  votedCount: number;
  notVotedCount: number;
  participationRate: number;
  totalVotesCast: number;
  perClass: Array<{
    id: string;
    name: string;
    grade: number;
    total: number;
    voted: number;
    notVoted: number;
    rate: number;
  }>;
  candidateStats: Array<{
    id: string;
    candidateNo: number;
    leaderName: string;
    viceLeaderName: string;
    slogan: string;
    photoUrl: string;
    votesCount: number;
    percentage: string;
  }>;
}

export interface VoteResults {
  totalVotes: number;
  totalStudents: number;
  votedStudents: number;
  totalStaff?: number;
  votedStaff?: number;
  totalVoters?: number;
  totalVoted?: number;
  participationPercentage: string;
  candidates: Array<{
    id: string;
    candidateNo: number;
    leaderName: string;
    viceLeaderName: string;
    leaderClass: string;
    viceLeaderClass: string;
    slogan: string;
    photoUrl: string;
    votesCount: number;
    percentage: string;
  }>;
  classParticipation: Array<{
    className: string;
    total: number;
    voted: number;
    percentage: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface TranscribeResult {
  success: boolean;
  text: string;
  modelUsed?: string;
  message?: string;
}

export interface NetworkInterfaceAddress {
  name: string;
  address: string;
  family: string;
  url: string;
}

export interface NetworkInfo {
  success: boolean;
  port: number;
  hostname: string;
  currentOrigin: string;
  addresses: NetworkInterfaceAddress[];
  recommendedUrl: string;
  firewallWindowsCmd: string;
}

