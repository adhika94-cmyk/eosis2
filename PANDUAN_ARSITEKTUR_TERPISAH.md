# Panduan Arsitektur Terpisah: Backend (Node.js Express) & Frontend (React Vite)

Aplikasi **eOSIS** telah diubah ke arsitektur decoupled (terpisah) antara **Backend REST API** dan **Frontend Web Application**.

---

## 🏛️ 1. Struktur Arsitektur

```text
├── backend/                       # 🟢 BACKEND (Node.js + Express REST API)
│   ├── app.ts                     # Inisialisasi Express, CORS, Middleware & Rute REST API
│   ├── server.ts                  # Entry point standalone server (Port 5000)
│   ├── package.json               # Dependensi & script khusus backend
│   └── .env.example               # Template environment backend (PORT, CORS_ORIGIN)
│
├── src/                           # 🔵 FRONTEND (React 19 + Vite + TypeScript)
│   ├── api.ts                     # HTTP Fetch client ke Backend REST API (VITE_API_URL)
│   ├── components/                # Komponen UI/UX bilik suara, quick count, admin, dll.
│   ├── App.tsx                    # Komponen utama aplikasi
│   └── main.tsx                   # Entry point React DOM
│
├── data/db.json                   # Penyimpanan database lokal (JSON File-based DB)
├── server.ts                      # Fullstack runner terintegrasi untuk preview (Port 3000)
├── vite.config.ts                 # Konfigurasi Vite & Dev Proxy ke backend
└── package.json                   # Script eksekusi bersama
```

---

## 🚀 2. Cara Menjalankan Keduanya di Lokal

Buka **2 terminal berbeda** di komputer Anda:

### 🔹 Terminal 1 — Menjalankan Backend (Port 5000)
```bash
npm run dev:backend
```
*Output yang muncul di terminal:*
```text
=======================================================
 🚀 eOSIS Standalone Backend REST API
 📡 Server running at http://0.0.0.0:5000
 🌐 Local access: http://localhost:5000
 🔒 CORS enabled for frontend clients
=======================================================
```

---

### 🔹 Terminal 2 — Menjalankan Frontend (Port 5173)
```bash
npm run dev:frontend
```
*Aplikasi frontend React Vite akan otomatis terbuka di browser pada:*
`http://localhost:5173`

Frontend akan langsung terhubung ke Backend REST API di `http://localhost:5000` via komunikasi HTTP Fetch dan CORS.

---

### 💡 Alternatif Mode 1-Perintah (Fullstack Terintegrasi di Port 3000)
Jika Anda hanya ingin menjalankan satu terminal saja:
```bash
npm run dev
```
Perintah ini akan menjalankan Express API dan Frontend Vite secara terintegrasi pada `http://localhost:3000`.

---

## 🔒 3. Konfigurasi CORS (Cross-Origin Resource Sharing)

Backend telah dikonfigurasi dengan middleware `cors()` di file `backend/app.ts`:
- **Allowed Origins**: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`, serta seluruh subnet IP jaringan lokal (Wi-Fi/LAN `192.168.x.x`, `10.x.x.x`).
- **Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Headers**: `Origin, X-Requested-With, Content-Type, Accept, Authorization`
- **Credentials**: Didukung untuk otentikasi berbasis token/header.

Variabel environment tambahan dapat diatur di file `.env`:
```ini
PORT=5000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
VITE_API_URL=http://localhost:5000
```

---

## 📡 4. Daftar Endpoint REST API Backend

### 🌐 Publik (Tanpa Autentikasi)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Cek status kesehatan server backend |
| `GET` | `/api/public/info` | Pengaturan sekolah, daftar kandidat & partisipasi |
| `GET` | `/api/public/quick-count` | Data perolehan suara & grafik tabulasi cepat |
| `GET` | `/api/public/network-info` | Informasi IP lokal server untuk sharing Wi-Fi |
| `GET` | `/api/public/demo-accounts` | Contoh akun login untuk pengujian cepat |

### 🎓 Siswa (Autentikasi Token `std_*`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/student/login` | Login siswa (Body: `nisn`, `birthDate`) |
| `GET` | `/api/student/me` | Profil data siswa yang sedang login |
| `POST` | `/api/student/vote` | Rekam coblosan suara (Body: `candidateId`) |

### 👨‍🏫 Guru & Tenaga Kependidikan (Autentikasi Token `stf_*`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/staff/login` | Login GTK (Body: `nip`, `birthYear`) |
| `GET` | `/api/staff/me` | Profil guru/staff yang sedang login |
| `POST` | `/api/staff/vote` | Rekam coblosan suara GTK (Body: `candidateId`) |

### 🛡️ Administrator (Autentikasi Token `adm_*`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Login admin (default: `admin` / `admin123`) |
| `GET` | `/api/admin/stats` | Rekapitulasi statistik DPT, kuorum & kelas |
| `GET / POST` | `/api/admin/classes` | Ambil / Tambah kelas rombel |
| `PUT / DELETE`| `/api/admin/classes/:id` | Ubah / Hapus kelas rombel |
| `GET / POST` | `/api/admin/students` | Ambil / Tambah siswa |
| `POST` | `/api/admin/students/bulk` | Impor massal siswa Excel/CSV |
| `POST` | `/api/admin/students/reset-votes` | Reset status hak suara siswa |
| `GET / POST` | `/api/admin/candidates` | Ambil / Tambah paslon kandidat |
| `POST` | `/api/admin/candidates/reset-all-votes` | Reset seluruh perolehan suara menjadi nol |
| `GET / PUT` | `/api/admin/settings` | Ambil / Perbarui pengaturan sekolah & penandatangan Berita Acara |

### 🤖 Fitur AI & Media
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Asisten AI pemilihan (Gemini 2.5 Flash) |
| `POST` | `/api/ai/transcribe-audio` | Transkripsi audio mikrofon pemilih |
| `POST` | `/api/upload` | Unggah foto kandidat / logo sekolah (Base64) |
