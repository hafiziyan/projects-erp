import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const adjustStockSchema = z.object({
  type: z.enum(['add', 'subtract', 'set']),
  quantity: z.union([z.string(), z.number()]),
  note: z.string().optional(),
});

function getMerchantIdFromHeader(req: Request): bigint | null {
  const merchantIdHeader = req.headers['x-merchant-id'];

  if (!merchantIdHeader) return null;

  const merchantIdValue = Array.isArray(merchantIdHeader)
    ? merchantIdHeader[0]
    : merchantIdHeader;

  if (!merchantIdValue) return null;
  if (!/^\d+$/.test(merchantIdValue)) return null;

  return BigInt(merchantIdValue);
}

function getSingleParam(param: string | string[] | undefined): string | null {
  if (!param) return null;
  return Array.isArray(param) ? param[0] ?? null : param;
}

function parseInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export async function getStocks(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Header x-merchant-id tidak valid',
      });
    }

    const searchRaw = req.query.search;
    const lowStockRaw = req.query.lowStock;

    const search = Array.isArray(searchRaw) ? searchRaw[0] : searchRaw;
    const lowStock = Array.isArray(lowStockRaw) ? lowStockRaw[0] : lowStockRaw;

    const stocks = await prisma.stock.findMany({
      where: {
        merchantId,
        product: {
          ...(search
            ? {
                name: {
                  contains: String(search),
                },
              }
            : {}),
        },
      },
      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },
      },
      orderBy: {
        productId: 'desc',
      },
    });

    const mapped = stocks.map((item) => ({
      stockId: item.id.toString(),
      productId: item.product.id.toString(),
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.actualQuantity,
      reservedQuantity: item.reservedQuantity,
      reorderPoint: item.product.reorderPoint,
      isLowStock: item.actualQuantity <= item.product.reorderPoint,
      status: item.product.status,
      price: Number(item.product.price),
      category: item.product.category
        ? {
            id: item.product.category.id.toString(),
            name: item.product.category.name,
          }
        : null,
      unit: item.product.unit
        ? {
            id: item.product.unit.id.toString(),
            name: item.product.unit.name,
          }
        : null,
      updatedAt: item.updatedAt,
    }));

    const filtered =
      lowStock === 'true'
        ? mapped.filter((item) => item.isLowStock)
        : mapped;

    return res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    console.error('getStocks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getStockDetail(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    const productIdRaw = getSingleParam(req.params.productId);

    if (!merchantId || !productIdRaw || !/^\d+$/.test(productIdRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Data request tidak valid',
      });
    }

    const productId = BigInt(productIdRaw);

    const stock = await prisma.stock.findFirst({
      where: {
        merchantId,
        productId,
      },
      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },
      },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stok tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        stockId: stock.id.toString(),
        productId: stock.product.id.toString(),
        productName: stock.product.name,
        sku: stock.product.sku,
        quantity: stock.actualQuantity,
        reservedQuantity: stock.reservedQuantity,
        reorderPoint: stock.product.reorderPoint,
        isLowStock: stock.actualQuantity <= stock.product.reorderPoint,
        status: stock.product.status,
        price: Number(stock.product.price),
        category: stock.product.category
          ? {
              id: stock.product.category.id.toString(),
              name: stock.product.category.name,
            }
          : null,
        unit: stock.product.unit
          ? {
              id: stock.product.unit.id.toString(),
              name: stock.product.unit.name,
            }
          : null,
        updatedAt: stock.updatedAt,
      },
    });
  } catch (error) {
    console.error('getStockDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function adjustStock(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const productIdRaw = getSingleParam(req.params.productId);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!merchantId || !productIdRaw || !/^\d+$/.test(productIdRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Data request tidak valid',
      });
    }

    const parsed = adjustStockSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const quantity = parseInteger(parsed.data.quantity);

    if (quantity === null || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity tidak valid',
      });
    }

    const productId = BigInt(productIdRaw);
    const userId = BigInt(authUser.userId);

    const stock = await prisma.stock.findFirst({
      where: {
        merchantId,
        productId,
      },
      include: {
        product: true,
      },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stok produk tidak ditemukan',
      });
    }

    let newQuantity = stock.actualQuantity;

    if (parsed.data.type === 'add') {
      newQuantity = stock.actualQuantity + quantity;
    } else if (parsed.data.type === 'subtract') {
      newQuantity = stock.actualQuantity - quantity;
    } else if (parsed.data.type === 'set') {
      newQuantity = quantity;
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stok tidak mencukupi untuk dikurangi',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedStock = await tx.stock.update({
        where: {
          id: stock.id,
        },
        data: {
          actualQuantity: newQuantity,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'ADJUST_STOCK',
          entity: 'Stock',
          entityId: updatedStock.id,
          description: `Stok produk ${stock.product.name} diubah dengan tipe ${parsed.data.type}, qty ${quantity}, hasil akhir ${newQuantity}. ${parsed.data.note || ''}`.trim(),
        },
      });

      return updatedStock;
    });

    return res.status(200).json({
      success: true,
      message: 'Stok berhasil diperbarui',
      data: {
        stockId: updated.id.toString(),
        productId: stock.product.id.toString(),
        productName: stock.product.name,
        previousQuantity: stock.actualQuantity,
        currentQuantity: updated.actualQuantity,
      },
    });
  } catch (error) {
    console.error('adjustStock error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}