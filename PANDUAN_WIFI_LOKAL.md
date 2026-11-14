# Panduan Konfigurasi Jaringan Wi-Fi Lokal & Berbagi ke Perangkat Lain (eOSIS)

Panduan ini menjelaskan cara membagikan aplikasi **eOSIS** agar dapat diakses oleh **smartphone (HP Android & iPhone), tablet, dan laptop siswa** melalui jaringan Wi-Fi lokal di sekolah, **tanpa perlu kuota internet**.

---

## 🚀 Ringkasan Cara Cepat (3 Langkah)

1. **Hubungkan Komputer Server & HP Siswa ke Wi-Fi yang Sama**
   - Gunakan Wi-Fi sekolah (misal: `SMPN2_HOTSPOT`) ATAU nyalakan **Hotspot Pribadi / Tethering** dari 1 smartphone panitia.
2. **Cari Tahu Alamat IP Server**
   - Buka Command Prompt di komputer server, ketik:
     ```cmd
     ipconfig
     ```
   - Lihat bagian `IPv4 Address`, contoh: `192.168.1.15`.
3. **Buka Aplikasi dari HP Siswa**
   - Di browser HP siswa (Google Chrome / Safari), buka:
     ```
     http://192.168.1.15:3000
     ```
   - Atau cukup **Scan QR Code** yang telah disediakan di menu Admin eOSIS!

---

## 🛡️ Solusi Jika HP Siswa Tidak Bisa Membuka Halaman (Connection Timed Out / Refused)

Secara bawaan, **Windows Defender Firewall** pada Windows 10/11 memblokir lalu lintas port masuk dari perangkat luar demi keamanan.

### Cara Mengizinkan Port 3000 di Windows Firewall:

#### Cara 1 (Otomatis dengan Script):
1. Buka folder proyek ini di Windows Explorer.
2. Klik kanan pada berkas `buka_firewall_port_3000.bat`.
3. Pilih **"Run as administrator"**.
4. Selesai! Port 3000 otomatis diizinkan.

#### Cara 2 (Manual via Command Prompt):
1. Buka Start Menu, ketik `cmd`.
2. Klik kanan **Command Prompt** &gt; pilih **"Run as administrator"**.
3. Ketik perintah berikut lalu tekan Enter:
   ```cmd
   netsh advfirewall firewall add rule name="eOSIS_Port_3000" dir=in action=allow protocol=TCP localport=3000
   ```
4. Pastikan muncul tulisan balasan `Ok.`.

---

## 📱 Fitur Bawaan QR Code & Mode Layar Penuh Proyektor di eOSIS

Aplikasi eOSIS kini telah dilengkapi dengan fitur otomatis:
1. **Pendeteksi Otomatis IP**: Server secara otomatis mendeteksi semua kartu jaringan (Wi-Fi, Ethernet, Hotspot) dan menyajikan link akses siap pakai.
2. **QR Code Generator**: Barcode QR langsung terbit di layar Admin. Siswa cukup membuka kamera HP untuk langsung masuk ke bilik suara.
3. **Mode Proyektor (Full Screen)**: Tombol *Mode Proyektor* menampilkan QR Code berukuran besar beserta nama sekolah dan panduan login, siap disorotkan ke dinding/layar auditorium sekolah saat hari pemilihan.
4. **Unduh QR Code (PNG)**: Panitia dapat mengunduh gambar QR Code untuk dicetak di kertas dan ditempel di depan pintu kelas atau bilik suara.

---

## 🌐 Mode Pemilihan 100% Offline Tanpa Pulsa / Kuota Internet

Pemilihan OSIS dapat diselenggarakan secara **mandiri tanpa koneksi internet**:
1. Ambil 1 buah smartphone panitia, lalu aktifkan **Personal Hotspot / Hotspot Portabel** (tanpa perlu menyalakan data seluler).
2. Sambungkan laptop server ke Wi-Fi hotspot tersebut.
3. Sambungkan seluruh smartphone siswa/pemilih ke Wi-Fi hotspot tersebut.
4. Karena router smartphone bekerja sebagai LAN lokal berkecepatan tinggi, proses login siswa dan pencoblosan berjalan instan dengan latensi di bawah 5 ms!

---

## ⚙️ Rincian Konfigurasi Teknis yang Diterapkan

- **Vite Configuration (`vite.config.ts`)**:
  ```ts
  server: {
    host: '0.0.0.0', // Mendengarkan di semua kartu jaringan / Wi-Fi
    port: 3000,
    strictPort: true
  }
  ```
- **Express Backend (`server.ts`)**:
  - `app.listen(3000, '0.0.0.0')`
  - CORS header aktif (`Access-Control-Allow-Origin: *`) agar request antar perangkat tidak ditolak browser.
  - Endpoint `/api/public/network-info` untuk inspeksi otomatis antarmuka jaringan.
