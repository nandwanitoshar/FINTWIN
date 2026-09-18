import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DigitalTwinService, NetworkQueryOptions } from '../services/digitalTwinService.js';

/**
 * GET /api/network
 * Returns full connected financial network with optional time range and filter type
 */
export const getNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const timeRange = (req.query.timeRange as NetworkQueryOptions['timeRange']) || (startDate || endDate ? 'CUSTOM' : 'ALL');
    const filterType = req.query.filterType as NetworkQueryOptions['filterType'];

    const network = await DigitalTwinService.getFinancialNetwork(userId, {
      timeRange,
      startDate,
      endDate,
      filterType,
    });
    res.status(200).json({ success: true, network });
  } catch (error: any) {
    console.error('[NetworkController] getNetwork error:', error);
    res.status(500).json({ success: false, message: 'Failed to construct financial network.' });
  }
};

/**
 * GET /api/network/summary
 * Returns deterministic summary metrics of the financial network
 */
export const getNetworkSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const timeRange = (req.query.timeRange as NetworkQueryOptions['timeRange']) || (startDate || endDate ? 'CUSTOM' : 'ALL');
    const summary = await DigitalTwinService.getNetworkSummary(userId, { timeRange, startDate, endDate });
    res.status(200).json({ success: true, summary });
  } catch (error: any) {
    console.error('[NetworkController] getNetworkSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute network summary.' });
  }
};

/**
 * GET /api/network/entity/:id
 * Relationship inspector for a specific entity
 */
export const getEntityNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const entityId = req.params.id;

    if (!entityId) {
      res.status(400).json({ success: false, message: 'Entity ID is required.' });
      return;
    }

    const result = await DigitalTwinService.getEntityNetworkDetails(userId, entityId);
    if (!result) {
      res.status(404).json({ success: false, message: 'Entity not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, details: result, ...result });
  } catch (error: any) {
    console.error('[NetworkController] getEntityNetwork error:', error);
    res.status(500).json({ success: false, message: 'Failed to inspect entity network.' });
  }
};

/**
 * GET /api/network/account/:id
 * Relationship inspector for a specific account
 */
export const getAccountNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const accountId = req.params.id;

    if (!accountId) {
      res.status(400).json({ success: false, message: 'Account ID is required.' });
      return;
    }

    const result = await DigitalTwinService.getAccountNetworkDetails(userId, accountId);
    if (!result) {
      res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, details: result, ...result });
  } catch (error: any) {
    console.error('[NetworkController] getAccountNetwork error:', error);
    res.status(500).json({ success: false, message: 'Failed to inspect account network.' });
  }
};

/**
 * GET /api/network/edge/:id
 * Detailed transaction flow inspector for a specific network edge
 */
export const getEdgeNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const edgeId = req.params.id;

    if (!edgeId) {
      res.status(400).json({ success: false, message: 'Edge ID is required.' });
      return;
    }

    const result = await DigitalTwinService.getEdgeDetails(userId, edgeId);
    if (!result) {
      res.status(404).json({ success: false, message: 'Edge not found or unauthorized.' });
      return;
    }

    res.status(200).json({ success: true, details: result, ...result });
  } catch (error: any) {
    console.error('[NetworkController] getEdgeNetwork error:', error);
    res.status(500).json({ success: false, message: 'Failed to inspect edge flow details.' });
  }
};

/**
 * GET /api/network/path?from=...&to=...&maxDepth=...
 * Deterministic relationship flow tracer
 */
export const getNetworkPath = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 3;

    if (!from || !to) {
      res.status(400).json({
        success: false,
        message: "Both 'from' and 'to' node IDs are required query parameters.",
      });
      return;
    }

    const result = await DigitalTwinService.findNetworkPath(userId, from, to, maxDepth);
    res.status(200).json({
      success: true,
      exists: Boolean(result.found),
      found: result.found,
      path: {
        ...result,
        found: result.found,
        nodes: result.nodes,
        edges: result.edges,
        depth: result.depth,
        length: (result.nodes || []).length,
      },
      nodes: result.nodes,
      edges: result.edges,
      depth: result.depth,
    });
  } catch (error: any) {
    console.error('[NetworkController] getNetworkPath error:', error);
    res.status(500).json({ success: false, message: 'Failed to trace network path.' });
  }
};

/**
 * POST /api/network/simulate
 * What-If Network Simulation (In-memory, non-mutating)
 */
export const simulateNetwork = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const result = await DigitalTwinService.simulateNetworkImpact(userId, req.body || {});
    res.status(200).json({ success: true, simulation: result, ...result });
  } catch (error: any) {
    console.error('[NetworkController] simulateNetwork error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to simulate network impact.' });
  }
};
