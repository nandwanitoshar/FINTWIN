import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNetwork,
  getNetworkSummary,
  getEntityNetwork,
  getAccountNetwork,
  getEdgeNetwork,
  getNetworkPath,
  simulateNetwork,
} from '../controllers/networkController.js';

export const networkRoutes = Router();

// All /api/network endpoints are tenant-isolated and require authentication
networkRoutes.get('/', requireAuth, getNetwork);
networkRoutes.get('/summary', requireAuth, getNetworkSummary);
networkRoutes.get('/path', requireAuth, getNetworkPath);
networkRoutes.get('/edge/:id', requireAuth, getEdgeNetwork);
networkRoutes.get('/entity/:id', requireAuth, getEntityNetwork);
networkRoutes.get('/account/:id', requireAuth, getAccountNetwork);
networkRoutes.post('/simulate', requireAuth, simulateNetwork);

export default networkRoutes;

