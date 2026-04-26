import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import {
  adjustStock,
  getStockDetail,
  getStocks,
  getStockHistory, // <-- Import fungsi baru ditambahkan di sini
} from '../controllers/stock.controller';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getStocks
);

// PENTING: Route history HARUS berada di atas route detail (/:productId)
router.get(
  '/:productId/history',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getStockHistory
);

router.get(
  '/:productId',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getStockDetail
);

router.patch(
  '/:productId/adjust',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  adjustStock
);

export default router;