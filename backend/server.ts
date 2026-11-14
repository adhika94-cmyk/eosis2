import { createApp } from './app.ts';

const app = createApp();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(` 🚀 eOSIS Standalone Backend REST API`);
  console.log(` 📡 Server listening on ${HOST}:${PORT}`);
  console.log(` 🔒 Place behind an HTTPS reverse proxy before production use.`);
  console.log(` 🔒 CORS enabled for frontend clients`);
  console.log(`=======================================================`);
});
