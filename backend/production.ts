// Portable production entrypoint: set the environment before importing the app.
process.env.NODE_ENV = 'production';
await import('./server.ts');
