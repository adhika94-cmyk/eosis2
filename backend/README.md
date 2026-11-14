# eOSIS Standalone Backend REST API (Node.js Express)

Layanan backend terpisah untuk aplikasi eOSIS SMP Negeri 2 Bogor.

## Menjalankan Backend:
```bash
npm install
npm run start
```
Atau dari root folder proyek:
```bash
npm run dev:backend
```

Backend mendengarkan pada port `5000` (atau nilai dari env `PORT`).
Dilengkapi konfigurasi CORS untuk menerima panggilan API dari frontend React Vite (`http://localhost:5173` atau `http://localhost:3000`).
