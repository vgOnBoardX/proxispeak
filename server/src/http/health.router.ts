/**
 * GET /health
 * Returns server status, timestamp, and uptime. No auth required.
 */
import { Router, type Request, type Response } from 'express';

const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    instanceId: process.env.INSTANCE_ID ?? 'unknown',
  });
});

export default healthRouter;
