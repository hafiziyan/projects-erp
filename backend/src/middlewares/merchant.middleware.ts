import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma'; // Sesuaikan path ini dengan struktur foldermu

export async function merchantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authUser = req.authUser;
    
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No Auth User',
      });
    }

    const merchantIdHeader = req.headers['x-merchant-id'];
    if (!merchantIdHeader) {
      return res.status(400).json({
        success: false,
        message: 'Merchant-Id header is required for this route',
      });
    }

    const merchantId = BigInt(merchantIdHeader as string);
    const userId = BigInt(authUser.userId);

    const membership = await prisma.merchantUser.findFirst({
      where: {
        merchantId,
        userId,
        status: 'active',
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this merchant',
      });
    }

    authUser.merchantId = merchantId.toString();
    authUser.role = membership.role.name;

    next();
  } catch (error) {
    console.error('merchantMiddleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error in Merchant Validation',
    });
  }
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.authUser;

    if (!authUser || !authUser.role || !allowedRoles.includes(authUser.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}