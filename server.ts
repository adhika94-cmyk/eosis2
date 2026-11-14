import 'dotenv/config';
import { createApp } from './backend/app.ts';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import express from 'express';

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`eOSIS Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
