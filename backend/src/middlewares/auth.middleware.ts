import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const decoded = verifyToken(token);

    req.authUser = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    console.error('AuthMiddleware: Token verification failed:', error);
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau expired',
    });
  }
}