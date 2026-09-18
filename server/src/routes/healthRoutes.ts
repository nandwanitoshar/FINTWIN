import { Router, Request, Response } from 'express';
import { getIsConnected, getDBStatus } from '../config/db.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const isConn = getIsConnected();
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'FinTwin AI Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    database: isConn ? 'connected' : 'disconnected',
    databaseDetails: getDBStatus(),
  });
});

router.get('/db', (req: Request, res: Response) => {
  const isConn = getIsConnected();
  if (isConn) {
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      connected: true,
      details: getDBStatus(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      connected: false,
      details: getDBStatus(),
    });
  }
});

export default router;

