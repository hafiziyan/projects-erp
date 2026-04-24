import { Router } from 'express';
import {
  createMerchant,
  deleteMerchant,
  getMerchantDetail,
  getMyMerchants,
  updateMerchant,
} from '../controllers/merchant.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, createMerchant);
router.get('/my', authMiddleware, getMyMerchants);
router.get('/:id', authMiddleware, getMerchantDetail);
router.put('/:id', authMiddleware, updateMerchant);
router.delete('/:id', authMiddleware, deleteMerchant);

export default router;