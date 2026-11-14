# eOSIS Tahap 4 — MFA, Peran Panitia, dan Persetujuan Dua Petugas

Tahap ini menambahkan lapisan kontrol administrator di atas paket Tahap 3.

## Fitur

1. **MFA TOTP untuk semua akun administrator**. Login password tidak langsung menerbitkan sesi; akun baru harus mendaftarkan authenticator. Login berikutnya memerlukan password dan kode 6 digit.
2. **Secret MFA dienkripsi saat tersimpan di SQLite** dengan AES-256-GCM. Kunci enkripsi terpisah dari token dan voter secret.
3. **Peran terpisah**:
   - `super_admin`: kelola akun panitia dan seluruh konfigurasi.
   - `election_admin`: kelola operasional dan mengajukan/menyetujui tindakan sesuai alur dua petugas.
   - `auditor`: akses baca saja.
4. **Akun panitia terpisah** disimpan pada tabel `admin_accounts`; akun lama diimpor otomatis sebagai `super_admin` saat tabel baru dibuat.
5. **Persetujuan dua petugas** untuk reset hak suara siswa, reset hak suara staf, reset seluruh suara, dan reset database. Pemohon tidak boleh menyetujui permintaannya sendiri. Persetujuan berlaku 15 menit dan hanya dapat dieksekusi oleh akun penyetuju.
6. **Audit trail** mencatat login gagal/berhasil, MFA, pembuatan akun, permintaan, persetujuan, dan eksekusi tindakan sensitif.
7. Halaman **Keamanan & Kontrol Panitia** ditambahkan ke sidebar admin.

## Konfigurasi environment

Salin `backend/.env.example` ke `.env`, lalu isi semua secret dengan nilai acak yang berbeda. Contoh membuat secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Isi setidaknya:

- `AUTH_TOKEN_SECRET`
- `VOTER_ID_SECRET` (jangan diganti selama pemilihan berlangsung)
- `ADMIN_MFA_ENCRYPTION_KEY`
- `ADMIN_INITIAL_PASSWORD` (hanya untuk bootstrap database baru)
- `CORS_ORIGIN`

Jangan memakai nilai contoh. Jangan menyimpan `.env` ke ZIP publik, repositori, atau membagikannya lewat chat. Backup database SQLite dan secret enkripsi secara terpisah serta terlindungi. Kehilangan `ADMIN_MFA_ENCRYPTION_KEY` membuat secret authenticator yang tersimpan tidak dapat didekripsi.

## Login admin pertama setelah upgrade

1. Pastikan database dan `.env` telah dicadangkan.
2. Jalankan server dengan konfigurasi secret yang benar.
3. Login menggunakan username dan password administrator yang sudah ada.
4. Sistem menampilkan kunci MFA. Tambahkan kunci ke aplikasi authenticator.
5. Masukkan kode 6 digit yang sedang berlaku untuk mengaktifkan MFA.
6. Login berikutnya wajib memasukkan kode authenticator setelah password.

Kunci setup hanya ditampilkan saat proses aktivasi. Simpan secara aman dan jangan kirim ke orang lain.

## Membuat akun panitia

1. Masuk sebagai `super_admin`.
2. Buka menu **Keamanan & Panitia**.
3. Buat akun dengan username unik, nama, password awal minimal 14 karakter, dan peran `election_admin` atau `auditor`.
4. Bagikan kredensial awal melalui saluran pribadi yang aman.
5. Saat login pertama, pengguna wajib mendaftarkan MFA miliknya sendiri.
6. Jangan gunakan akun bersama. Setiap petugas harus mempunyai identitas login dan authenticator sendiri.

## Alur persetujuan dua petugas

1. Petugas pertama memilih jenis reset, mengisi alasan/nomor berita acara, lalu mengajukan permintaan.
2. Petugas kedua masuk dengan akun berbeda dan MFA aktif, lalu menyetujui permintaan di halaman yang sama.
3. Petugas kedua yang menyetujui dapat menekan **Jalankan tindakan**. Sistem memeriksa bahwa pemohon berbeda dari penyetuju dan persetujuan belum kedaluwarsa.
4. Catat alasan, nomor berita acara, dan hasil tindakan pada dokumen panitia.

Jangan melakukan reset ketika pemungutan suara sedang berjalan. Untuk pemilihan resmi, reset harus memerlukan keputusan tertulis panitia dan persetujuan pihak sekolah.

## Verifikasi yang dilakukan dalam paket ini

- Pemeriksaan sintaks runtime Node untuk `backend/app.ts` dan `src/server/db.ts` berhasil.
- Uji SQLite: bootstrap super administrator berhasil.
- Uji penyimpanan MFA: secret tersimpan sebagai ciphertext `enc:v1` dan dapat dibaca kembali melalui fungsi database.
- Uji alur persetujuan: permintaan dibuat, akun kedua menyetujui, dan persetujuan berhasil dikonsumsi satu kali.
- ZIP proyek akan diperiksa ulang setelah dibuat.

**Belum dilakukan:** build Vite/TypeScript penuh, pengujian browser, uji TOTP terhadap aplikasi authenticator eksternal, pengujian penetrasi, pengujian beban, serta audit independen. Instalasi dependensi dalam lingkungan pemeriksaan tidak selesai karena timeout jaringan. Karena itu paket ini belum dapat dinyatakan siap pemilihan resmi.

## Catatan keamanan dan batasan

- Token admin masih menggunakan bearer token yang disimpan frontend seperti implementasi Tahap 3. Pemindahan ke cookie `HttpOnly; Secure; SameSite` dan perlindungan CSRF masih perlu dikerjakan.
- MFA memakai TOTP standar dengan toleransi waktu ±30 detik. Sinkronkan jam server dan perangkat authenticator.
- Tidak ada prosedur pemulihan MFA otomatis di panel. Jika perangkat hilang, lakukan pemulihan melalui prosedur offline yang disetujui sekolah, setelah verifikasi identitas dan berita acara; jangan menghapus secret langsung saat pemilihan berjalan.
- Audit log berada di database aplikasi. Untuk kebutuhan pembuktian resmi, salin log secara berkala ke penyimpanan append-only/offline yang dikuasai panitia/auditor.
- Peran `auditor` hanya dibatasi pada metode HTTP baca. Tetap lakukan pemeriksaan semua route dan API sebelum deployment.
- Persetujuan dua petugas bukan pengganti audit independen atau prosedur tata kelola pemilihan.

## Menjalankan

Gunakan Node.js 22.5 atau lebih baru. Setelah environment dikonfigurasi:

```bash
npm ci
npm run build
npm start
```

Jangan mengarahkan domain pemilihan resmi ke server sebelum build penuh, UAT panitia, backup/restore test, uji keamanan, dan persetujuan tertulis pihak sekolah selesai.
