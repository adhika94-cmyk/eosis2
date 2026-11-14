@echo off
:: ========================================================
:: Script Buka Port 3000 Firewall Windows untuk eOSIS
:: SMP Negeri 2 Bogor - E-Voting Pemilihan OSIS
:: ========================================================
echo ========================================================
echo  Membuka Port 3000 di Windows Firewall untuk eOSIS...
echo ========================================================
echo.

:: Memeriksa hak Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Menjalankan sebagai Administrator...
) else (
    echo [PERINGATAN] Script ini membutuhkan hak administrator!
    echo Silakan klik kanan file ini lalu pilih "Run as administrator".
    echo.
    pause
    exit /b
)

:: Menambahkan aturan firewall untuk Port 3000 TCP
netsh advfirewall firewall delete rule name="eOSIS_Port_3000" >nul 2>&1
netsh advfirewall firewall add rule name="eOSIS_Port_3000" dir=in action=allow protocol=TCP localport=3000

if %errorLevel% == 0 (
    echo.
    echo ========================================================
    echo  [BERHASIL] Port 3000 telah dibuka di Windows Firewall!
    echo  Perangkat lain (HP / Tablet / Laptop Siswa) sekarang
    echo  dapat mengakses eOSIS via Wi-Fi lokal.
    echo ========================================================
) else (
    echo.
    echo [GAGAL] Gagal menambahkan aturan firewall. Silakan jalankan secara manual.
)

echo.
echo Alamat IP komputer Anda saat ini:
ipconfig | findstr /i "IPv4"
echo.
pause
