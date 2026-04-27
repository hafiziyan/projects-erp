import { Request, Response } from 'express';
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

// ... (Fungsi createMerchantUser & getMerchantUsers tetap sama)

export async function toggleMerchantUserStatus(req: Request, res: Response) {
  try {
    // FIX: Gunakan helper agar 'id' dipastikan string, bukan string[]
    const idRaw = getSingleParam(req.params.id);
    const { status } = req.body;

    if (!idRaw) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    await prisma.merchantUser.update({
      where: { id: BigInt(idRaw) }, // Sekarang aman
      data: { status }
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Toggle failed' });
  }
}

export async function updateMerchantUserRole(req: Request, res: Response) {
  try {
    const idRaw = getSingleParam(req.params.id);
    const { roleName } = req.body;

    if (!idRaw) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    await prisma.merchantUser.update({
      where: { id: BigInt(idRaw) },
      data: { roleId: role.id }
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
}