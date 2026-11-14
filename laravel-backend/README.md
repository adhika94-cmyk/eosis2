# Panduan Lengkap Online & Deploy eOSIS SMP Negeri 2 Bogor menggunakan Laravel & MySQL

Dokumen ini berisi panduan lengkap langkah demi langkah untuk meng-online-kan aplikasi **eOSIS SMP Negeri 2 Bogor** ke server hosting / VPS pribadi sekolah menggunakan backend **PHP Laravel (v11/v12)** dan database **MySQL / MariaDB**.

---

## 📌 Status Online Saat Ini
Aplikasi eOSIS ini **sudah otomatis aktif online** dan dapat diakses publik melalui Google Cloud Run:
- **URL Publik Siap Pakai**: Tersedia di panel preview AI Studio Anda.
- **Akun Admin Default**: Username: `admin` | Password: `admin123`

Jika Anda ingin memindahkan/menghosting sendiri di domain sekolah (misal: `osis.smpn2bogor.sch.id`), ikuti langkah-langkah di bawah ini.

---

## 📂 Struktur Konfigurasi Laravel yang Telah Disediakan
Semua berkas konfigurasi Laravel sudah dibuat lengkap di folder `/laravel-backend`:
- `.env.example` : Konfigurasi database MySQL, URL aplikasi, dan CORS
- `composer.json` : Kebutuhan dependencies Laravel 11 & Sanctum
- `routes/api.php` : Seluruh REST API endpoint (Auth Siswa, Guru, Admin, Voting Atomic, Quick Count, CRUD)
- `database/migrations/` : Skema tabel database (Settings, Classes, Candidates, Students, Staff, Admins)
- `database/seeders/DatabaseSeeder.php` : Data awal SMPN 2 Bogor (Kandidat, Kelas, Akun demo)
- `app/Models/` : Eloquent Models
- `app/Http/Controllers/Api/` : Controller lengkap dengan Pessimistic Locking (`lockForUpdate()`) anti-double voting & unlimited bulk import
- `nginx-vhost.conf` : Konfigurasi web server Nginx
- `public/.htaccess` : Konfigurasi Apache / cPanel

---

## 🚀 Panduan 1: Deploy di cPanel / Shared Hosting (Cara Termudah)

### Langkah 1: Buat Database MySQL di cPanel
1. Masuk ke **cPanel** akun hosting Anda.
2. Buka menu **MySQL Database Wizard**.
3. Buat database baru, contoh: `u1234_eosis`.
4. Buat user database baru dan password yang kuat, lalu berikan **ALL PRIVILEGES**.

### Langkah 2: Upload File Laravel ke Hosting
1. Di cPanel, buka **File Manager**.
2. Buat folder baru di luar `public_html` (misal: `/home/user/laravel-eosis`).
3. Upload seluruh isi folder `laravel-backend` ke folder `/home/user/laravel-eosis`.
4. Salin file `.env.example` menjadi `.env`, lalu edit isinya:
   ```ini
   APP_NAME="eOSIS SMP Negeri 2 Bogor"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://osis.sekolahanda.sch.id

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=u1234_eosis
   DB_USERNAME=u1234_eosisuser
   DB_PASSWORD=password_database_anda
   ```

### Langkah 3: Build Frontend React & Tempatkan di `public_html`
1. Di komputer lokal / AI Studio terminal, jalankan perintah build frontend:
   ```bash
   npm run build
   ```
2. Hasil build akan berada di folder `dist/`.
3. Upload seluruh file di dalam folder `dist/` ke folder `public_html` (atau subdomain folder `osis.sekolahanda.sch.id`).
4. Pastikan file `.htaccess` dari `laravel-backend/public/.htaccess` juga ikut terpasang di `public_html`.

### Langkah 4: Jalankan Migration & Seeder Database
Di cPanel, buka menu **Terminal** (atau melalui SSH):
```bash
cd /home/user/laravel-eosis
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --seed --force
php artisan storage:link
```

---

## 🖥️ Panduan 2: Deploy di VPS Ubuntu (Nginx + PHP 8.2-FPM + MariaDB)

### Langkah 1: Persiapan Server VPS
Jalankan di terminal SSH server Anda:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mariadb-server php8.2-fpm php8.2-mysql php8.2-curl php8.2-xml php8.2-mbstring php8.2-zip unzip git composer
```

### Langkah 2: Buat Database MariaDB / MySQL
```bash
sudo mysql -u root
```
Di dalam MySQL prompt:
```sql
CREATE DATABASE eosis_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eosis_user'@'localhost' IDENTIFIED BY 'PasswordKuat123!';
GRANT ALL PRIVILEGES ON eosis_db.* TO 'eosis_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Langkah 3: Setup Project di `/var/www/eosis`
```bash
sudo mkdir -p /var/www/eosis
sudo chown -R $USER:$USER /var/www/eosis
# Salin file laravel-backend ke /var/www/eosis
cd /var/www/eosis
cp .env.example .env
nano .env # Sesuaikan DB_DATABASE, DB_USERNAME, DB_PASSWORD
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --seed --force
php artisan storage:link
```

### Langkah 4: Build & Pasang Frontend
Di folder frontend aplikasi:
```bash
npm run build
# Salin isi dist/ ke folder public Laravel
cp -r dist/* /var/www/eosis/public/
```

### Langkah 5: Set Izin Akses Folder
```bash
sudo chown -R www-data:www-data /var/www/eosis/storage /var/www/eosis/bootstrap/cache /var/www/eosis/public
sudo chmod -R 775 /var/www/eosis/storage /var/www/eosis/bootstrap/cache
```

### Langkah 6: Pasang Virtual Host Nginx & SSL
1. Salin file `laravel-backend/nginx-vhost.conf` ke `/etc/nginx/sites-available/eosis`:
   ```bash
   sudo cp nginx-vhost.conf /etc/nginx/sites-available/eosis
   sudo ln -s /etc/nginx/sites-available/eosis /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
2. Pasang SSL gratis via Certbot Let's Encrypt:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d osis.smpn2bogor.sch.id
   ```

---

## 🔑 Data Akun Login Bawaan (Default Seed)
Setelah menjalankan `php artisan migrate --seed`:

| Role | Username / ID | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses penuh dashboard eOSIS |
| **Siswa (Contoh)** | `0098765431` | `2011-04-12` | Login: NISN + Tgl Lahir (YYYY-MM-DD) |
| **Siswa (Contoh 2)** | `0098765432` | `2011-08-25` | Login: NISN + Tgl Lahir (YYYY-MM-DD) |
| **Guru/Staff** | `197405201998021001` | `1974` | Login: NIP + Tahun Lahir (4 digit) |

---

## 🛡️ Keamanan & Integritas Voting (Luber Jurdil)
- **Anti Double Voting**: Controller menggunakan `DB::beginTransaction()` dan `lockForUpdate()` pada record pemilih dan kandidat sehingga suara tidak bisa ganda meski siswa membuka banyak tab bersamaan.
- **Secret Ballot**: Pilihan kandidat tidak pernah disimpan bersamaan dengan data NISN/NIP pemilih.
- **Import Tanpa Batas**: Mendukung impor ribuan data siswa via CSV/Excel dengan *auto-create class* dan *chunk processing*.
