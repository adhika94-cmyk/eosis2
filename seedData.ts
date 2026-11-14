import crypto from 'crypto';

export interface SchoolSettings {
  id: string;
  schoolName: string;
  schoolAddress: string;
  electionPeriod: string;
  electionStatus: 'open' | 'paused' | 'closed';
  electionDate: string; // Target tanggal & jam pelaksanaan pemilihan (YYYY-MM-DDTHH:mm:ss)
  electionEndDate: string; // Target jam penutupan bilik suara
  isQuickCountPublic: boolean; // Apakah quick count dapat dilihat pemilih
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

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string; // SHA-256
  name: string;
}

export interface ClassItem {
  id: string;
  name: string;
  grade: number;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  classId: string;
  className: string;
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
}

export interface TeacherStaff {
  id: string;
  nip: string; // NIP / NUPTK
  name: string;
  birthYear: string; // Password login (contoh: "1985")
  role: string; // Jabatan / Mata Pelajaran
  gender: 'L' | 'P';
  hasVoted: boolean;
  votedAt: string | null;
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
  votesCount: number;
}

export interface AppDatabase {
  settings: SchoolSettings;
  admin: AdminUser;
  classes: ClassItem[];
  students: Student[];
  staff: TeacherStaff[];
  candidates: Candidate[];
}

export const initialClasses: ClassItem[] = [
  { id: 'c-7a', name: '7-A', grade: 7 },
  { id: 'c-7b', name: '7-B', grade: 7 },
  { id: 'c-7c', name: '7-C', grade: 7 },
  { id: 'c-7d', name: '7-D', grade: 7 },
  { id: 'c-7e', name: '7-E', grade: 7 },
  { id: 'c-8a', name: '8-A', grade: 8 },
  { id: 'c-8b', name: '8-B', grade: 8 },
  { id: 'c-8c', name: '8-C', grade: 8 },
  { id: 'c-8d', name: '8-D', grade: 8 },
  { id: 'c-8e', name: '8-E', grade: 8 },
  { id: 'c-9a', name: '9-A', grade: 9 },
  { id: 'c-9b', name: '9-B', grade: 9 },
  { id: 'c-9c', name: '9-C', grade: 9 },
  { id: 'c-9d', name: '9-D', grade: 9 },
];

export const initialCandidates: Candidate[] = [
  {
    id: 'cand-01',
    candidateNo: 1,
    leaderName: 'Muhammad Rizky Pratama',
    viceLeaderName: 'Alya Syakira Putri',
    leaderClass: '8-B',
    viceLeaderClass: '7-C',
    slogan: 'Inovatif, Berkarakter, Menginspirasi (IBM)',
    vision: 'Menjadikan OSIS SMP Negeri 2 Bogor sebagai wadah aspirasi siswa yang inklusif, adaptif terhadap perkembangan teknologi digital, serta menjunjung tinggi nilai budi pekerti luhur dan kesantunan khas Spenda.',
    mission: [
      'Menumbuhkan budaya saling menghormati, anti-perundungan (stop bullying), dan toleransi aktif di lingkungan sekolah.',
      'Mengoptimalkan media digital sekolah sebagai sarana kreatif penyaluran bakat seni, literasi, sains, dan teknologi.',
      'Mengadakan program "Spenda Berbagi & Peduli" secara berkala untuk mempererat kepedulian sosial.',
      'Menjalin kolaborasi aktif antarekstrakurikuler dalam mewujudkan prestasi di tingkat Kota Bogor hingga Nasional.'
    ],
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
    votesCount: 28
  },
  {
    id: 'cand-02',
    candidateNo: 2,
    leaderName: 'Bagus Danendra Kusuma',
    viceLeaderName: 'Nadine Zahra Ramadhani',
    leaderClass: '8-E',
    viceLeaderClass: '8-A',
    slogan: 'Spenda Juara: Santun, Unggul, dan Berdaya Saing',
    vision: 'Mewujudkan peserta didik SMPN 2 Bogor yang aktif, berprestasi cemerlang di bidang akademik maupun non-akademik, berwawasan lingkungan hijau (Eco-School), dan memiliki integritas kepemimpinan yang tangguh.',
    mission: [
      'Membuka forum aspirasi terbuka secara rutin untuk menampung ide dan masukan seluruh siswa bagi kemajuan sekolah.',
      'Menggalakkan gerakan "Green Spenda" melalui pengelolaan sampah terpadu dan penghijauan taman sekolah.',
      'Mengadakan mentoring sebaya dan workshop persiapan lomba OSN, O2SN, dan FLS2N.',
      'Meningkatkan kedisiplinan dan rasa tanggung jawab warga sekolah melalui program Duta Tata Tertib OSIS.'
    ],
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    votesCount: 34
  },
  {
    id: 'cand-03',
    candidateNo: 3,
    leaderName: 'Farhan Maulana Akbar',
    viceLeaderName: 'Clarissa Anindya Salsabila',
    leaderClass: '8-C',
    viceLeaderClass: '7-B',
    slogan: 'Aksi Nyata untuk Spenda yang Bersinergi dan Harmonis',
    vision: 'Terwujudnya OSIS SMP Negeri 2 Bogor yang responsif, transparan, mempererat persaudaraan, dan menginspirasi siswa untuk berani berkarya serta berjiwa wirausaha muda.',
    mission: [
      'Menyelenggarakan Spenda Cup tahunan yang mencakup kompetisi olahraga, e-sport edukatif, dan pentas seni kreasi.',
      'Membuat buletin dan podcast berkala OSIS yang informatif dan menghibur seputar kehidupan sekolah.',
      'Menghidupkan program kerja kolaboratif dengan dewan guru dan alumni berprestasi.',
      'Mengembangkan jiwa kewirausahaan siswa melalui stan bazar kreatif saat peringatan hari besar nasional.'
    ],
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    votesCount: 22
  }
];

export const initialStudents: Student[] = [
  // Siswa demo yang BELUM memilih
  {
    id: 'std-1001',
    nisn: '0098765431',
    name: 'Ahmad Fauzan Nugraha',
    birthDate: '2011-04-12',
    classId: 'c-8b',
    className: '8-B',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1002',
    nisn: '0098765432',
    name: 'Siti Nurhaliza Putri',
    birthDate: '2011-08-25',
    classId: 'c-8b',
    className: '8-B',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1003',
    nisn: '0098765433',
    name: 'Raffi Raditya Putra',
    birthDate: '2012-01-15',
    classId: 'c-7a',
    className: '7-A',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1004',
    nisn: '0098765434',
    name: 'Nabila Azzahra Firdaus',
    birthDate: '2012-06-03',
    classId: 'c-7b',
    className: '7-B',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1005',
    nisn: '0098765435',
    name: 'Daffa Arya Wicaksana',
    birthDate: '2010-11-20',
    classId: 'c-9a',
    className: '9-A',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1006',
    nisn: '0098765436',
    name: 'Keisha Amanda Maharani',
    birthDate: '2011-09-09',
    classId: 'c-8c',
    className: '8-C',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1007',
    nisn: '0098765437',
    name: 'Bima Satria Wibowo',
    birthDate: '2012-03-18',
    classId: 'c-7c',
    className: '7-C',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1008',
    nisn: '0098765438',
    name: 'Zaskia Adelia Putri',
    birthDate: '2010-07-14',
    classId: 'c-9b',
    className: '9-B',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1009',
    nisn: '0098765439',
    name: 'Fikri Haikal Rahman',
    birthDate: '2011-12-30',
    classId: 'c-8d',
    className: '8-D',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'std-1010',
    nisn: '0098765440',
    name: 'Tania Kirana Larasati',
    birthDate: '2012-05-22',
    classId: 'c-7d',
    className: '7-D',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },

  // Siswa demo yang SUDAH memilih
  {
    id: 'std-2001',
    nisn: '0098765421',
    name: 'Kharisma Ananda Devina',
    birthDate: '2011-02-14',
    classId: 'c-8a',
    className: '8-A',
    gender: 'P',
    hasVoted: true,
    votedAt: '2026-11-03T08:15:30.000Z'
  },
  {
    id: 'std-2002',
    nisn: '0098765422',
    name: 'Rizki Aditya Pratama',
    birthDate: '2010-10-10',
    classId: 'c-9c',
    className: '9-C',
    gender: 'L',
    hasVoted: true,
    votedAt: '2026-11-03T08:22:15.000Z'
  },
  {
    id: 'std-2003',
    nisn: '0098765423',
    name: 'Alifia Cindy Wardani',
    birthDate: '2012-07-07',
    classId: 'c-7e',
    className: '7-E',
    gender: 'P',
    hasVoted: true,
    votedAt: '2026-11-03T08:35:40.000Z'
  },
  {
    id: 'std-2004',
    nisn: '0098765424',
    name: 'Galang Panji Asmoro',
    birthDate: '2011-05-19',
    classId: 'c-8e',
    className: '8-E',
    gender: 'L',
    hasVoted: true,
    votedAt: '2026-11-03T09:02:11.000Z'
  },
  {
    id: 'std-2005',
    nisn: '0098765425',
    name: 'Jessica Olivia Wijaya',
    birthDate: '2010-12-01',
    classId: 'c-9d',
    className: '9-D',
    gender: 'P',
    hasVoted: true,
    votedAt: '2026-11-03T09:18:45.000Z'
  }
];

export const initialStaff: TeacherStaff[] = [
  {
    id: 'stf-101',
    nip: '197405201998021001',
    name: 'Drs. H. Mulyadi, M.Pd.',
    birthYear: '1974',
    role: 'Wakil Kepala Sekolah / Guru Matematika',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'stf-102',
    nip: '197808122005012004',
    name: 'Dra. Hj. Siti Romlah, M.Pd.',
    birthYear: '1978',
    role: 'Guru Bahasa Indonesia',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'stf-103',
    nip: '198503152010011012',
    name: 'Hendra Gunawan, S.Pd.',
    birthYear: '1985',
    role: 'Guru IPA / Pembina OSIS',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'stf-104',
    nip: '199011242019032015',
    name: 'Dewi Lestari, S.Kom.',
    birthYear: '1990',
    role: 'Guru Informatika',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'stf-105',
    nip: '198207192008011007',
    name: 'Agus Supriyadi, S.AP.',
    birthYear: '1982',
    role: 'Kepala Tata Usaha',
    gender: 'L',
    hasVoted: false,
    votedAt: null
  },
  {
    id: 'stf-106',
    nip: '199304182020122009',
    name: 'Ratna Kusuma, A.Md.',
    birthYear: '1993',
    role: 'Staf Tata Usaha / Kepegawaian',
    gender: 'P',
    hasVoted: false,
    votedAt: null
  },
  // Guru yang sudah memilih (demo)
  {
    id: 'stf-201',
    nip: '198806052014021003',
    name: 'Bambang Prakoso, S.Pd.',
    birthYear: '1988',
    role: 'Guru PJOK',
    gender: 'L',
    hasVoted: true,
    votedAt: '2026-11-03T08:10:00.000Z'
  }
];

// SHA-256 for 'admin123'
export const defaultAdminHash = crypto.createHash('sha256')
  .update(process.env.ADMIN_INITIAL_PASSWORD || 'admin123').digest('hex');

export const initialSettings: SchoolSettings = {
  id: 'default',
  schoolName: 'SMP Negeri 2 Bogor',
  schoolAddress: 'Jl. Ir. H. Juanda No. 16, Pabaton, Bogor Tengah, Kota Bogor, Jawa Barat 16121',
  electionPeriod: '2026/2027',
  electionStatus: 'paused',
  electionDate: '2026-11-04T08:00:00',
  electionEndDate: '2026-11-04T15:00:00',
  isQuickCountPublic: true,
  logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&q=80&w=200',
  votingRules: 'Satu pemilih (siswa/guru/staff) berhak atas satu suara sah. Suara bersifat langsung, umum, bebas, rahasia, jujur, dan adil.',
  committeeChairmanName: 'Muhammad Rizky Pratama',
  committeeChairmanId: 'NISN. 0089218291',
  osisAdvisorName: 'Hendra Gunawan, S.Pd.',
  osisAdvisorNip: 'NIP. 198503152010011012',
  headmasterName: 'Dra. Hj. Sri Wahyuni, M.Pd.',
  headmasterNip: 'NIP. 197405201998021001',
  reportLetterNumber: '042/PPO-OSIS/SMPN2/2026'
};
