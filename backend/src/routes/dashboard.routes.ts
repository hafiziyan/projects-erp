import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';

const router = Router();

router.get(
  '/summary',
  authMiddleware,
  requireRole(['Owner', 'Kasir', 'Gudang']),
  getDashboardSummary
);

export default router;