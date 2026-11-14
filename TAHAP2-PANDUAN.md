# Panduan Tahap 2 — SQLite dan transaksi suara

## Isi perubahan
- Backend memakai `node:sqlite` bawaan Node.js; tidak memerlukan paket native tambahan.
- Database aktif: `data/eosis.sqlite`.
- JSON lama `data/db.json` tetap dipertahankan sebagai sumber migrasi/arsip.
- Pemilihan baru pada mode production dimulai dalam status `paused` dengan daftar siswa, guru/staff, kelas, dan kandidat kosong.

## Menjalankan lokal
1. Gunakan Node.js 22.5 atau lebih baru.
2. Jalankan `npm ci`.
3. Untuk pengembangan, jalankan `npm run dev`.
4. Frontend tetap dijalankan sesuai konfigurasi Vite yang sudah ada.

## Inisialisasi production
1. Buat `.env` dari `backend/.env.example`.
2. Isi `ADMIN_INITIAL_PASSWORD`, `AUTH_TOKEN_SECRET`, dan `VOTER_ID_SECRET` dengan nilai acak/kuat yang berbeda.
3. Pastikan `NODE_ENV=production`, `ALLOW_LEGACY_JSON_IMPORT=false`, dan `CORS_ORIGIN` hanya berisi domain frontend resmi.
4. Jalankan `npm start`. Aplikasi akan membuat database SQLite baru tanpa data contoh dan tetap menjeda pemilihan.
5. Impor daftar pemilih dan kandidat yang sudah diverifikasi panitia. Jangan membuka pemilihan sampai seluruh data dan pengaturan diperiksa.

## Migrasi dari JSON lama
1. Hentikan backend.
2. Buat salinan utuh direktori `data/` dan verifikasi file `db.json` dapat dibaca.
3. Periksa jumlah siswa, guru/staff, kandidat, status pemilih, dan total suara dalam JSON lama. Data contoh yang tertanam dalam seed harus dibedakan dari data pemilihan yang sah.
4. Pada `.env`, ubah `ALLOW_LEGACY_JSON_IMPORT=true` hanya untuk startup migrasi satu kali.
5. Jalankan `npm start`, lalu periksa log dan hasil melalui panel admin/rekap. Data lama tetap disimpan; aplikasi membuat `eosis.sqlite`.
6. Hentikan backend dan kembalikan `ALLOW_LEGACY_JSON_IMPORT=false`.
7. Jangan membuka pemilihan sebelum panitia menyetujui rekonsiliasi hasil migrasi.

## Catatan suara lama
Total suara kandidat dari JSON lama diimpor sebagai ballot bertipe `legacy` karena JSON lama tidak memiliki catatan ballot individual. Sistem tidak mengarang hubungan antara pemilih dan kandidat. Data historis ini tetap masuk ke agregat sampai panitia menjalankan prosedur reset seluruh pemilihan secara sah.

## Batas penggunaan
SQLite harus berada di disk lokal persisten pada satu host dan satu instance backend. Jangan menjalankan beberapa instance backend/cluster terhadap file database yang sama. Uji backup/restore, beban, pemulihan kegagalan, dan audit independen tetap wajib sebelum pemilihan resmi.
