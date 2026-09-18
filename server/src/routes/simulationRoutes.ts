import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  runSimulation,
  compareScenarios,
  getSimulationHistory,
  getSimulationById,
  deleteSimulationScenario,
} from '../controllers/simulationController.js';

export const simulationRoutes = Router();

// Core Simulation Operations
simulationRoutes.post('/run', requireAuth, runSimulation);
simulationRoutes.post('/compare', requireAuth, compareScenarios);
simulationRoutes.get('/history', requireAuth, getSimulationHistory);
simulationRoutes.get('/history/:id', requireAuth, getSimulationById);
simulationRoutes.delete('/history/:id', requireAuth, deleteSimulationScenario);
simulationRoutes.get('/:id', requireAuth, getSimulationById);
simulationRoutes.delete('/:id', requireAuth, deleteSimulationScenario);
