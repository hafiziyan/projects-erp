import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import {
  createCategory,
  createProduct,
  createUnit,
  activateProduct,
  deactivateProduct,
  deleteCategory,
  deleteUnit,
  getCategories,
  getProductDetail,
  getProducts,
  getUnits,
  updateCategory,
  updateProduct,
  updateUnit,
} from '../controllers/master-data.controller';

const router = Router();

/* CATEGORY */
router.post(
  '/categories',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  createCategory
);

router.get(
  '/categories',
  authMiddleware,
  requireRole(['Owner', 'Gudang', 'Kasir']),
  getCategories
);

router.patch(
  '/categories/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  updateCategory
);

router.delete(
  '/categories/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  deleteCategory
);

/* UNIT */
router.post(
  '/units',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  createUnit
);

router.get(
  '/units',
  authMiddleware,
  requireRole(['Owner', 'Gudang', 'Kasir']),
  getUnits
);

router.patch(
  '/units/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  updateUnit
);

router.delete(
  '/units/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  deleteUnit
);

/* PRODUCT */
router.post(
  '/products',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  createProduct
);

router.get(
  '/products',
  authMiddleware,
  requireRole(['Owner', 'Gudang', 'Kasir']),
  getProducts
);

router.get(
  '/products/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  getProductDetail
);

// Specific routes MUST come before general :id routes for correct matching
router.patch(
  '/products/:id/deactivate',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  deactivateProduct
);

router.patch(
  '/products/:id/activate',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  activateProduct
);

router.patch(
  '/products/:id',
  authMiddleware,
  requireRole(['Owner', 'Gudang']),
  updateProduct
);

export default router;