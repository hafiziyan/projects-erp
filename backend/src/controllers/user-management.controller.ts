import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Helper untuk memastikan ID dari params bukan array
function getSingleParam(param: string | string[] | undefined): string | null {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
}

function getMerchantIdFromHeader(req: Request): bigint | null {
  const h = req.headers['x-merchant-id'];
  const val = Array.isArray(h) ? h[0] : h;
  return val && /^\d+$/.test(val) ? BigInt(val) : null;
}

const createMerchantUserSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal satu huruf besar')
    .regex(/[a-z]/, 'Password harus mengandung minimal satu huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung minimal satu angka'),
  roleName: z.enum(['Kasir', 'Gudang'], {
    errorMap: () => ({ message: 'Role tidak valid' }),
  }),
});

async function ensureOwnerAccess(userId: bigint, merchantId: bigint) {
  return prisma.merchantUser.findFirst({
    where: {
      userId,
      merchantId,
      status: 'active',
      role: { name: 'Owner' },
    },
  });
}

export async function createMerchantUser(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId) return res.status(400).json({ success: false, message: 'Merchant belum dipilih' });

    const owner = await ensureOwnerAccess(BigInt(authUser.userId), merchantId);
    if (!owner) {
      return res.status(403).json({ success: false, message: 'Hanya Owner yang dapat menambah user merchant' });
    }

    const parsed = createMerchantUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
    }

    const { name, email, password, roleName } = parsed.data;
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(404).json({ success: false, message: 'Role tidak ditemukan' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });

      if (!user) {
        user = await tx.user.create({
          data: { name, email, password: hashedPassword, status: 'active' },
        });
      }

      const existingMembership = await tx.merchantUser.findUnique({
        where: { merchantId_userId: { merchantId, userId: user.id } },
      });

      if (existingMembership) {
        throw new Error('USER_ALREADY_IN_MERCHANT');
      }

      const merchantUser = await tx.merchantUser.create({
        data: {
          merchantId,
          userId: user.id,
          roleId: role.id,
          status: 'active',
        },
        include: { user: true, role: true, merchant: true },
      });

      return merchantUser;
    });

    return res.status(201).json({
      success: true,
      message: 'User merchant berhasil ditambahkan',
      data: {
        merchantUserId: result.id.toString(),
        userId: result.user.id.toString(),
        name: result.user.name,
        email: result.user.email,
        userStatus: result.status,
        role: result.role.name,
        merchantId: result.merchant.id.toString(),
        merchantName: result.merchant.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_ALREADY_IN_MERCHANT') {
      return res.status(409).json({ success: false, message: 'User sudah terdaftar di merchant ini' });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Email atau user merchant sudah terdaftar' });
    }

    console.error('createMerchantUser error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambah user merchant' });
  }
}

export async function getMerchantUsers(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId) return res.status(400).json({ success: false, message: 'Merchant belum dipilih' });

    const membership = await prisma.merchantUser.findFirst({
      where: {
        userId: BigInt(authUser.userId),
        merchantId,
        status: 'active',
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke merchant ini' });
    }

    const merchantUsers = await prisma.merchantUser.findMany({
      where: { merchantId },
      include: { user: true, role: true, merchant: true },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: merchantUsers.map((item) => ({
        merchantUserId: item.id.toString(),
        userId: item.user.id.toString(),
        name: item.user.name,
        email: item.user.email,
        userStatus: item.status,
        role: item.role.name,
        merchantId: item.merchant.id.toString(),
        merchantName: item.merchant.name,
      })),
    });
  } catch (error) {
    console.error('getMerchantUsers error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat user merchant' });
  }
}

export async function toggleMerchantUserStatus(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const idRaw = getSingleParam(req.params.id);
    const { status } = req.body;

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId) return res.status(400).json({ success: false, message: 'Merchant belum dipilih' });
    if (!idRaw || !/^\d+$/.test(idRaw)) return res.status(400).json({ success: false, message: 'ID tidak valid' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid' });

    const owner = await ensureOwnerAccess(BigInt(authUser.userId), merchantId);
    if (!owner) {
      return res.status(403).json({ success: false, message: 'Hanya Owner yang dapat mengubah status user merchant' });
    }

    const target = await prisma.merchantUser.findFirst({
      where: { id: BigInt(idRaw), merchantId },
      include: { role: true },
    });

    if (!target) return res.status(404).json({ success: false, message: 'User merchant tidak ditemukan' });
    if (target.role.name === 'Owner') {
      return res.status(400).json({ success: false, message: 'Status Owner tidak dapat diubah dari halaman ini' });
    }

    await prisma.merchantUser.update({
      where: { id: BigInt(idRaw) },
      data: { status },
    });

    return res.status(200).json({ success: true, message: 'Status user merchant berhasil diperbarui' });
  } catch (error) {
    console.error('toggleMerchantUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Toggle failed' });
  }
}

export async function updateMerchantUserRole(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const idRaw = getSingleParam(req.params.id);
    const { roleName } = req.body;

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId) return res.status(400).json({ success: false, message: 'Merchant belum dipilih' });
    if (!idRaw || !/^\d+$/.test(idRaw)) return res.status(400).json({ success: false, message: 'ID tidak valid' });
    if (!['Kasir', 'Gudang'].includes(roleName)) return res.status(400).json({ success: false, message: 'Role tidak valid' });

    const owner = await ensureOwnerAccess(BigInt(authUser.userId), merchantId);
    if (!owner) {
      return res.status(403).json({ success: false, message: 'Hanya Owner yang dapat mengubah role user merchant' });
    }

    const target = await prisma.merchantUser.findFirst({
      where: { id: BigInt(idRaw), merchantId },
      include: { role: true },
    });

    if (!target) return res.status(404).json({ success: false, message: 'User merchant tidak ditemukan' });
    if (target.role.name === 'Owner') {
      return res.status(400).json({ success: false, message: 'Role Owner tidak dapat diubah dari halaman ini' });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    await prisma.merchantUser.update({
      where: { id: BigInt(idRaw) },
      data: { roleId: role.id },
    });

    return res.status(200).json({ success: true, message: 'Role user merchant berhasil diperbarui' });
  } catch (error) {
    console.error('updateMerchantUserRole error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah role' });
  }
}