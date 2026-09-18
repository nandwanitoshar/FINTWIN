import dotenv from 'dotenv';
import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureDemoUser } from './services/seedService.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  // Connect to DB (with resilient in-memory fallback if no active MongoDB server)
  await connectDB();

  // Ensure official demo user exists for demonstrations & judging
  await ensureDemoUser();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 FinTwin AI Backend Server Running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`=========================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[Server] Closed remaining connections. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('[Fatal Error starting server]:', err);
  process.exit(1);
});
