# eOSIS Tahap 3 — Kode Pemilih Sekali Pakai dan Audit Keamanan

## Perubahan
- Login siswa dan guru/staf memakai kode acak 32 karakter heksadesimal (128 bit); NISN/tanggal lahir dan NIP/tahun lahir tidak lagi menjadi faktor login.
- Kode disimpan sebagai HMAC-SHA256, bukan teks biasa, menggunakan `VOTER_ID_SECRET`. Rahasia ini juga dipakai untuk pseudonim pemilih pada pembatasan satu suara; jangan dirotasi selama pemilihan aktif.
- Kode hanya dapat dipakai sekali. Konsumsi kode dilakukan dalam transaksi SQLite `BEGIN IMMEDIATE`.
- Penerbitan kode hanya untuk admin terautentikasi; kode mentah hanya dikembalikan pada saat penerbitan.
- Penerbitan, penggunaan kode, dan pencatatan suara dicatat pada `security_audit`. Event suara tidak menyimpan ID kandidat.
- Panel demo login lama dihapus.

## Rahasia environment wajib
Production wajib memakai nilai acak dan berbeda untuk `AUTH_TOKEN_SECRET`, `VOTER_ID_SECRET` (minimal 32 karakter), serta `ADMIN_INITIAL_PASSWORD`. Jangan commit `.env`. Ganti password awal setelah setup.

## Penerbitan kode
Gunakan token admin dari sesi admin di mesin panitia tepercaya:

```bash
curl -X POST https://DOMAIN-RESMI/api/admin/voter-codes/generate \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"voterType":"student"}'
```

Untuk guru/staf gunakan `{"voterType":"staff"}`. Respons berisi `code`, `name`, dan `group`. Simpan secara terenkripsi/terbatas dan distribusikan tertutup. Penerbitan ulang mengganti kode aktif yang belum digunakan pada kategori tersebut; jangan dilakukan setelah distribusi tanpa prosedur pencabutan dan distribusi ulang yang disetujui panitia.

## Audit log
`GET /api/admin/security-audit` (Bearer token admin) menampilkan event terbaru. Log berada pada database yang sama; sebelum pemilihan resmi, ekspor berkala ke penyimpanan append-only terpisah.

## Batasan yang belum selesai
- Sesi masih bearer token; frontend masih menyimpan token di `localStorage`. Perlu cookie `HttpOnly`, `Secure`, `SameSite` dan proteksi CSRF.
- Belum ada MFA admin, pemisahan peran panitia, atau persetujuan dua petugas untuk penerbitan ulang kode, reset, dan perubahan status.
- Endpoint penerbitan kode tersedia tetapi belum ada layar administrasi/ekspor CSV.
- Kode dikonsumsi saat login. Jika sesi hilang sebelum memilih, panitia harus menerbitkan ulang sesuai prosedur tertulis.
- Anonimitas ballot belum diaudit independen; korelasi waktu antara partisipasi dan ballot masih harus dinilai.
- Build penuh, uji runtime/concurrency, backup-restore, uji penetrasi, dan penelaahan kebijakan sekolah tetap wajib.

**Status: belum disertifikasi layak untuk pemilihan resmi.**
