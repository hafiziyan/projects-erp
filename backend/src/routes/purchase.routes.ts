import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import {
  createPurchase,
  getPurchaseDetail,
  getPurchases,
} from '../controllers/purchase.controller';

const router = Router();

/**
 * @route   POST /api/purchases
 * @desc    Membuat transaksi pembelian baru (Restok)
 * @access  Private (Owner, Gudang)
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  createPurchase
);

/**
 * @route   GET /api/purchases
 * @desc    Mengambil semua daftar transaksi pembelian
 * @access  Private (Owner, Gudang)
 */
router.get(
  '/',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getPurchases
);

/**
 * @route   GET /api/purchases/:id
 * @desc    Mengambil detail transaksi pembelian berdasarkan ID
 * @access  Private (Owner, Gudang)
 */
router.get(
  '/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getPurchaseDetail
);

export default router;