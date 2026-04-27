import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as Ctrl from '../controllers/user-management.controller';

const router = Router();

// Pastikan di controller nama fungsinya: createMerchantUser
router.post('/', authMiddleware, Ctrl.createMerchantUser);

// Pastikan di controller nama fungsinya: getMerchantUsers
router.get('/', authMiddleware, Ctrl.getMerchantUsers);

// Pastikan di controller nama fungsinya: updateMerchantUserRole
router.patch('/:id/role', authMiddleware, Ctrl.updateMerchantUserRole);

// Pastikan di controller nama fungsinya: toggleMerchantUserStatus
router.patch('/:id/status', authMiddleware, Ctrl.toggleMerchantUserStatus);

export default router;