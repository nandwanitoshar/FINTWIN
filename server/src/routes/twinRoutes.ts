import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDigitalTwin, getNetworkGraph } from '../controllers/twinController.js';

export const twinRoutes = Router();

// /api/twin endpoints
twinRoutes.get('/', requireAuth, getDigitalTwin);
twinRoutes.get('/network', requireAuth, getNetworkGraph);
