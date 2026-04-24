import { Router } from 'express';
import { 
  login, 
  logout, 
  me, 
  registerOwner, 
  forgotPassword, 
  resetPassword 
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rute Auth Standar
router.post('/register', registerOwner);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);

// === RUTE BARU UNTUK LUPA PASSWORD ===
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;