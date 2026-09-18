import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import entityRoutes from './routes/entityRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import ingestRoutes from './routes/ingestRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import { twinRoutes } from './routes/twinRoutes.js';
import networkRoutes from './routes/networkRoutes.js';
import { simulationRoutes } from './routes/simulationRoutes.js';
import { analysisRoutes } from './routes/analysisRoutes.js';
import { riskSignalRoutes } from './routes/riskSignalRoutes.js';
import { reportRoutes } from './routes/reportRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import askRoutes from './routes/askRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import dataQualityRoutes from './routes/dataQualityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

export const createApp = () => {
  const app = express();

  // Core Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        // Allow any localhost/127.0.0.1 port or configured client URL
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        const isClientUrl = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;
        if (isLocalhost || isClientUrl || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/entities', entityRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/recurring', recurringRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/ask', askRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/data-quality', dataQualityRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ingest', ingestRoutes);
  app.use('/api/pipeline', pipelineRoutes);
  app.use('/api/twin', twinRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api/risk-signals', riskSignalRoutes);
  app.use('/api/simulation', simulationRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/report', reportRoutes);
  app.use('/api/intelligence-report', reportRoutes);


  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`,
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Unhandled Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
      errors: err.errors || [],
    });
  });

  return app;
};

export const app = createApp();
