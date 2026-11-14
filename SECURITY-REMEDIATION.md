# Catatan Keamanan eOSIS — Tahap Perbaikan 1 dan 2

## Perubahan Tahap 1
- Token Bearer ditandatangani HMAC-SHA256, berlaku 8 jam, dan diverifikasi dengan perbandingan waktu-konstan.
- `AUTH_TOKEN_SECRET` wajib diisi (minimal 32 karakter) pada production.
- Password administrator menggunakan scrypt dengan salt acak; hash SHA-256 lama diverifikasi untuk migrasi setelah login berhasil.
- Endpoint `/api/public/demo-accounts` dinonaktifkan.
- CORS menggunakan allowlist `CORS_ORIGIN`.
- Percobaan login dibatasi secara dasar (in-memory per proses).
- Upload gambar memerlukan autentikasi admin, pembatasan ukuran, pemeriksaan signature, dan nama acak.
- Batas body JSON 8 MB dan security headers ditambahkan.
- Backend default bind ke `127.0.0.1` dan harus ditempatkan di belakang HTTPS reverse proxy.

## Perubahan Tahap 2
- Penyimpanan aplikasi dipindahkan ke SQLite melalui modul bawaan `node:sqlite`; file database berada di `data/eosis.sqlite`.
- SQLite dikonfigurasi dengan WAL, `synchronous=FULL`, foreign keys, dan busy timeout.
- Pemungutan suara memakai `BEGIN IMMEDIATE`; insert ke `voter_participation` dan `anonymous_ballots` serta pembaruan agregat terjadi dalam satu transaksi.
- `voter_participation` menyimpan HMAC pseudonym pemilih dan waktu partisipasi. `anonymous_ballots` menyimpan ballot ID acak, tipe pemilih, dan kandidat, tanpa NISN/NIP/ID pemilih maupun foreign key ke tabel pemilih.
- Pseudonym dibuat dari NISN/NIP menggunakan `VOTER_ID_SECRET`, sehingga penghapusan lalu impor ulang identitas yang sama tidak otomatis memberi hak suara kedua.
- Unique primary key pada `voter_key` mencegah satu identitas memilih dua kali, termasuk saat dua proses mencoba memilih bersamaan.
- Data contoh pada database baru production tidak dimuat: siswa, staff, kelas, dan kandidat kosong; pemilihan berstatus paused. Panitia harus mengimpor data yang sudah diverifikasi.
- Data JSON lama tidak dihapus. Pada production, migrasi dari `data/db.json` memerlukan `ALLOW_LEGACY_JSON_IMPORT=true` setelah backup dan verifikasi manual.
- Reset hak suara perorangan dinonaktifkan karena tidak aman dengan ballot anonim. Reset seluruh kelompok menghapus partisipasi dan ballot untuk kelompok tersebut; reset seluruh pemilihan menghapus semua ballot.
- Kandidat yang sudah menerima suara tidak dapat dihapus.
- Skrip npm diarahkan ke entrypoint `backend/server.ts` yang memang tersedia.

## Konfigurasi production
1. Gunakan Node.js 22.5+ (disarankan rilis LTS yang telah diuji oleh pengelola server); `node:sqlite` masih dapat menampilkan peringatan experimental pada beberapa versi Node 22.
2. Salin `backend/.env.example` ke `.env` pada server. Jangan commit file `.env`.
3. Isi `AUTH_TOKEN_SECRET` dan `VOTER_ID_SECRET` dengan dua secret acak yang berbeda, masing-masing minimal 32 karakter. Jangan mengganti `VOTER_ID_SECRET` selama periode pemilihan karena akan mengubah pseudonym pemilih.
4. Isi `ADMIN_INITIAL_PASSWORD` hanya saat inisialisasi database pertama. Gunakan password unik kuat; simpan di password manager panitia.
5. Atur `CORS_ORIGIN` hanya ke origin frontend resmi. Gunakan HTTPS reverse proxy dan jangan mengekspos port backend langsung.
6. Database SQLite dan direktori `data/` harus berada pada disk lokal persisten dengan izin akses terbatas; jangan menaruh SQLite WAL pada filesystem jaringan yang tidak mendukung locking dengan benar.
7. Backup konsisten harus mencakup file SQLite beserta prosedur backup SQLite yang benar. Uji restore pada salinan terpisah sebelum hari pemilihan.
8. Jika memigrasikan JSON lama: hentikan layanan, buat backup utuh, verifikasi hasil dan total suara lama, baru aktifkan `ALLOW_LEGACY_JSON_IMPORT=true` untuk satu kali startup. Setelah migrasi sukses, kembalikan nilainya ke `false`.

## Batasan yang masih harus diselesaikan — belum boleh dianggap layak pemilihan resmi
- Pemisahan tabel mengurangi hubungan langsung identitas-pilihan, tetapi bukan jaminan anonimitas kriptografis terhadap administrator database atau analisis forensik tingkat rendah. Diperlukan review independen atas threat model dan desain ballot.
- Login siswa masih memakai NISN + tanggal lahir dan guru memakai NIP + tahun lahir. Ganti dengan kredensial sekali pakai yang dibuat secara acak, didistribusikan aman, dan tidak dapat ditebak.
- Token frontend masih disimpan di `localStorage`; perlu sesi `HttpOnly; Secure; SameSite` dan perlindungan CSRF atau desain setara.
- Rate limiter masih in-memory per proses; gunakan shared store jika ada lebih dari satu instance. Untuk deployment ini gunakan satu instance backend pada satu host dengan SQLite lokal.
- Operasi admin non-voting masih memakai snapshot state aplikasi; jangan menjalankan beberapa instance backend bersamaan. Perlu transaksi/optimistic locking menyeluruh untuk operasi administrasi.
- Reset massal dan reset database masih perlu step-up authentication, persetujuan dua petugas, alasan tertulis, dan audit log append-only.
- Belum ada audit log append-only, tanda tangan hasil, mekanisme verifikasi surat suara oleh pemilih, atau audit trail independen.
- Belum dijalankan build penuh dengan seluruh dependency, pengujian penetrasi, uji beban produksi, uji restore dari backup, atau audit independen.

## Gate sebelum pemilihan resmi
1. Kredensial pemilih acak sekali pakai dan prosedur distribusi/pemulihan.
2. Review independen atas anonimitas, manipulasi hasil, threat model, dan akses administrator.
3. Audit log yang tidak dapat diubah dan kontrol dua petugas untuk operasi kritis.
4. Backup, restore drill, pemantauan, rencana insiden, dan dokumentasi chain-of-custody.
5. Build produksi dan uji end-to-end, concurrency, kegagalan proses/disk, duplikasi identitas, serta simulasi penuh dengan data dummy.
6. Persetujuan tertulis panitia dan pimpinan sekolah setelah hasil pengujian ditinjau.
