import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// Schema dengan validasi angka saja dan batasan karakter
const createMerchantSchema = z.object({
  name: z.string().min(3, 'Nama merchant minimal 3 karakter'),
  address: z.string().optional(),
  phone: z
    .string()
    .min(10, 'Nomor telepon minimal 10 angka')
    .max(15, 'Nomor telepon maksimal 15 angka')
    .regex(/^\d+$/, 'Nomor telepon hanya boleh berisi angka')
    .optional()
    .or(z.literal('')), // Memungkinkan string kosong jika tidak diisi
});

export async function createMerchant(req: Request, res: Response) {
  try {
    const authUser = req.authUser;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const parsed = createMerchantSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const { name, address, phone } = parsed.data;

    const ownerRole = await prisma.role.findUnique({
      where: {
        name: 'Owner',
      },
    });

    if (!ownerRole) {
      return res.status(500).json({
        success: false,
        message: 'Role Owner tidak ditemukan. Jalankan seed terlebih dahulu.',
      });
    }

    const userId = BigInt(authUser.userId);

    const result = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          name,
          address,
          phone,
          status: 'active',
        },
      });

      const merchantUser = await tx.merchantUser.create({
        data: {
          merchantId: merchant.id,
          userId,
          roleId: ownerRole.id,
          status: 'active',
        },
        include: {
          role: true,
          merchant: true,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId: merchant.id,
          userId,
          action: 'CREATE_MERCHANT',
          entity: 'Merchant',
          entityId: merchant.id,
          description: `Merchant ${merchant.name} berhasil dibuat oleh user ID ${userId.toString()}`,
        },
      });

      return {
        merchant,
        merchantUser,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Merchant berhasil dibuat',
      data: {
        merchant: {
          id: result.merchant.id.toString(),
          name: result.merchant.name,
          address: result.merchant.address,
          phone: result.merchant.phone,
          status: result.merchant.status,
        },
        membership: {
          merchantUserId: result.merchantUser.id.toString(),
          role: result.merchantUser.role.name,
          status: result.merchantUser.status,
        },
      },
    });
  } catch (error) {
    console.error('createMerchant error:', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getMyMerchants(req: Request, res: Response) {
  try {
    const authUser = req.authUser;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userId = BigInt(authUser.userId);

    const merchantUsers = await prisma.merchantUser.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        merchant: true,
        role: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: merchantUsers.map((item) => ({
        merchantUserId: item.id.toString(),
        merchantId: item.merchant.id.toString(),
        merchantName: item.merchant.name,
        address: item.merchant.address,
        phone: item.merchant.phone,
        merchantStatus: item.merchant.status,
        role: item.role.name,
        membershipStatus: item.status,
      })),
    });
  } catch (error) {
    console.error('getMyMerchants error:', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getMerchantDetail(req: Request, res: Response) {
  try {
    const authUser = req.authUser;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const merchantIdRaw = req.params.id;

    const merchantIdParam = Array.isArray(merchantIdRaw)
      ? merchantIdRaw[0]
      : merchantIdRaw;

    if (!merchantIdParam || !/^\d+$/.test(merchantIdParam)) {
      return res.status(400).json({
        success: false,
        message: 'ID merchant tidak valid',
      });
    }

    const merchantId = BigInt(merchantIdParam);
    const userId = BigInt(authUser.userId);

    const membership = await prisma.merchantUser.findFirst({
      where: {
        merchantId,
        userId,
        status: 'active',
      },
      include: {
        merchant: true,
        role: true,
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Merchant tidak ditemukan atau Anda tidak memiliki akses',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        merchantUserId: membership.id.toString(),
        merchantId: membership.merchant.id.toString(),
        merchantName: membership.merchant.name,
        address: membership.merchant.address,
        phone: membership.merchant.phone,
        merchantStatus: membership.merchant.status,
        role: membership.role.name,
      },
    });
  } catch (error) {
    console.error('getMerchantDetail error:', error);

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}