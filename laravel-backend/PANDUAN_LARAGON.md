# Panduan Lengkap Meng-Online-kan eOSIS Menggunakan Laragon (Windows)

Laragon adalah lingkungan server lokal berbasis Windows yang sangat cepat, ringan, dan populer di kalangan sekolah di Indonesia. Panduan ini menjelaskan bagaimana cara memasang dan meng-online-kan aplikasi **eOSIS SMP Negeri 2 Bogor** langsung dari komputer/laptop server sekolah menggunakan Laragon.

---

## 📌 3 Cara Meng-online-kan Laragon
Pilihlah metode yang paling sesuai dengan kebutuhan pemilihan OSIS sekolah Anda:

| Metode | Tingkat Kemudahan | Biaya | Cocok Untuk |
| :--- | :--- | :--- | :--- |
| **1. Fitur "Share" Bawaan Laragon (Ngrok)** | ⭐⭐⭐⭐⭐ (Sangat Mudah) | Gratis | Uji coba cepat, pemilihan langsung hari H, link HTTPS instan |
| **2. Cloudflare Tunnel (Domain Sekolah)** | ⭐⭐⭐⭐ (Rekomendasi Terbaik) | Gratis | Ingin memakai domain sekolah (`osis.smpn2bogor.sch.id`) tanpa sewa hosting/VPS |
| **3. Jaringan Wi-Fi / LAN Sekolah** | ⭐⭐⭐⭐⭐ (Tanpa Internet) | Gratis | Pemilihan di lab komputer atau bilik suara via router Wi-Fi sekolah |

---

## 🛠️ Bagian 1: Persiapan Project di Laragon

### Langkah 1: Siapkan Laragon di Komputer/Laptop
1. Pastikan Anda telah menginstal **Laragon Full** (minimal PHP 8.2, MySQL/MariaDB, Apache/Nginx).
2. Buka Laragon, klik tombol **"Start All"**.
3. Pastikan Apache dan MySQL berstatus warna hijau / aktif.

### Langkah 2: Tempatkan Berkas di `C:\laragon\www`
1. Buka folder `C:\laragon\www\`.
2. Buat folder baru bernama `eosis`, sehingga lokasinya menjadi:
   ```
   C:\laragon\www\eosis
   ```
3. Salin seluruh isi folder `laravel-backend` ke dalam folder `C:\laragon\www\eosis`.

### Langkah 3: Buat Database di Laragon (HeidiSQL / phpMyAdmin)
1. Di jendela utama Laragon, klik tombol **"Database"** (HeidiSQL akan terbuka otomatis) atau klik kanan Laragon > **MySQL** > **phpMyAdmin**.
2. Klik kanan pada sesi MySQL > pilih **Create new** > **Database**.
3. Beri nama database: `eosis_db` dengan Collation: `utf8mb4_unicode_ci`.
4. Klik **OK / Simpan**.

### Langkah 4: Sesuaikan Berkas `.env`
Di dalam folder `C:\laragon\www\eosis`:
1. Salin file `.env.example` dan ubah namanya menjadi `.env`.
2. Buka dengan Notepad atau VS Code, lalu sesuaikan konfigurasi database bawaan Laragon (default user: `root`, tanpa password):
   ```ini
   APP_NAME="eOSIS SMP Negeri 2 Bogor"
   APP_ENV=local
   APP_DEBUG=true
   APP_URL=http://eosis.test

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=eosis_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

### Langkah 5: Jalankan Perintah Artisan via Terminal Laragon
1. Di jendela utama Laragon, klik tombol **"Terminal"** (akan membuka Cmder).
2. Masuk ke folder eosis dan jalankan perintah:
   ```bash
   cd C:\laragon\www\eosis
   composer install
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   ```
3. *Catatan:* Perintah `php artisan migrate --seed` akan otomatis membuat tabel dan mengisi data awal kandidat, kelas, akun admin (`admin` / `admin123`), serta akun contoh siswa & guru SMPN 2 Bogor.

### Langkah 6: Build Frontend React
Di terminal Laragon yang sama:
```bash
npm install
npm run build
```
Salin berkas hasil build di folder `dist/` ke dalam folder `C:\laragon\www\eosis\public\`.

---

## 🌐 Bagian 2: Cara Meng-Online-kan

### METODE 1: Menggunakan Fitur "Share" Bawaan Laragon (Ngrok) — *Paling Cepat*
Laragon sudah memiliki fitur bawaan untuk membuat website lokal menjadi online via tunneling Ngrok:
1. Klik kanan pada jendela atau tray icon Laragon.
2. Arahkan mouse ke menu **Quick app** > **Share** (atau **www** > **eosis** > **Share**).
3. Jendela terminal tunnel akan muncul dan menampilkan URL publik HTTPS, contoh:
   ```
   Forwarding: https://a1b2-c3d4.ngrok-free.app -> http://eosis.test
   ```
4. **Selesai!** Bagikan URL `https://xxxx.ngrok-free.app` tersebut kepada siswa dan panitia pemilihan. Aplikasi sudah bisa diakses dari HP Android, iPhone, laptop, maupun tablet di mana saja selama PC Laragon tetap menyala.

---

### METODE 2: Menggunakan Cloudflare Tunnel (Rekomendasi Domain Sekolah Resmi)
Jika sekolah memiliki domain (misal `smpn2bogor.sch.id`), Anda bisa membuat subdomain `osis.smpn2bogor.sch.id` mengarah langsung ke Laragon di PC sekolah secara **GRATIS, AMAN, dan OTOMATIS SSL HTTPS**, tanpa sewa VPS:

1. Unduh **cloudflared** untuk Windows dari website resmi Cloudflare (`cloudflared-windows-amd64.exe`).
2. Letakkan file tersebut di folder `C:\laragon\bin\` dan rename menjadi `cloudflared.exe`.
3. Buka Terminal Laragon, lalu jalankan:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:80
   ```
   *Atau jika menggunakan Cloudflare Dashboard (Zero Trust)*:
4. Buat Tunnel di dashboard Cloudflare Zero Trust (menu *Networks* > *Tunnels*).
5. Hubungkan hostname `osis.smpn2bogor.sch.id` ke layanan lokal `http://localhost:80`.
6. Jalankan service connector di PC sekolah. Seluruh warga sekolah kini bisa mengakses `https://osis.smpn2bogor.sch.id` langsung dari server Laragon sekolah Anda!

---

### METODE 3: Online di Jaringan Wi-Fi / LAN Sekolah (Tanpa Butuh Kuota Internet)
Jika pemilihan diadakan di lingkungan sekolah (misal di lab komputer atau bilik suara yang terhubung ke satu router Wi-Fi sekolah):
1. Cari tahu Alamat IP Komputer Server Laragon:
   - Buka Command Prompt, ketik `ipconfig`.
   - Lihat bagian IPv4 Address (contoh: `192.168.1.50`).
2. Izinkan Apache melalui Windows Firewall:
   - Buka **Windows Defender Firewall** > **Allow an app through firewall** > centang **Apache HTTP Server** (Private & Public).
3. Di HP siswa atau komputer lab siswa, buka browser dan ketik:
   ```
   http://192.168.1.50/eosis/public
   ```
   atau buat DNS lokal / hosts di router mikrotik sekolah mengarah ke IP `192.168.1.50`.
4. Seluruh siswa dapat mencoblos secara serentak dengan kecepatan lokal gigabit tanpa memakan kuota internet!

---

## 🔑 Data Login Setelah Migrasi Database di Laragon

| Role Pemilih | Akun Login | Kata Sandi | Catatan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh dashboard panitia eOSIS |
| **Siswa (Contoh 1)** | `0098765431` | `2011-04-12` | NISN + Tanggal Lahir (YYYY-MM-DD) |
| **Siswa (Contoh 2)** | `0098765432` | `2011-08-25` | NISN + Tanggal Lahir (YYYY-MM-DD) |
| **Guru/Staff (Contoh)**| `197405201998021001` | `1974` | NIP + Tahun Lahir (4 digit) |

---

## 💡 Tips Penting Saat Hari Pemilihan
1. **Daya PC Server**: Pastikan laptop/PC server tidak masuk ke mode *Sleep* (*Power & Sleep Settings* > *Never Sleep*).
2. **Koneksi Stabil**: Gunakan kabel LAN untuk komputer server agar koneksi data stabil saat ratusan pemilih mengakses bilik suara.
3. **Backup Data**: Setelah pemilihan selesai, backup database via HeidiSQL: klik kanan database `eosis_db` > **Export database as SQL**.
