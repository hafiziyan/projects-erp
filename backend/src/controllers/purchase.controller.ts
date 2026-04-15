import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createPurchaseSchema = z.object({
  invoiceNumber: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.union([z.string(), z.number()]),
        quantity: z.union([z.string(), z.number()]),
        cost: z.union([z.string(), z.number()]),
      })
    )
    .min(1, 'Minimal ada 1 item pembelian'),
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

function parseNumberValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function generatePurchaseInvoiceNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;

  return `PUR-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

export async function createPurchase(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Header x-merchant-id tidak valid',
      });
    }

    const parsed = createPurchaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const userId = BigInt(authUser.userId);

    const normalizedItems = parsed.data.items.map((item) => {
      const productId = parseInteger(item.productId);
      const quantity = parseInteger(item.quantity);
      const cost = parseNumberValue(item.cost);

      return { productId, quantity, cost };
    });

    if (
      normalizedItems.some(
        (item) =>
          item.productId === null ||
          item.quantity === null ||
          item.cost === null ||
          item.quantity <= 0 ||
          item.cost < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Data item pembelian tidak valid',
      });
    }

    const productIds = normalizedItems.map((item) => BigInt(item.productId as number));

    const products = await prisma.product.findMany({
      where: {
        merchantId,
        id: {
          in: productIds,
        },
      },
      include: {
        stock: true,
      },
    });

    if (products.length !== normalizedItems.length) {
      return res.status(404).json({
        success: false,
        message: 'Ada produk yang tidak ditemukan',
      });
    }

    const detailedItems = normalizedItems.map((item) => {
      const product = products.find((p) => p.id.toString() === String(item.productId));

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      return {
        product,
        quantity: item.quantity as number,
        cost: item.cost as number,
        subtotal: (item.quantity as number) * (item.cost as number),
      };
    });

    const totalAmount = detailedItems.reduce((sum, item) => sum + item.subtotal, 0);

    const invoiceNumber =
      parsed.data.invoiceNumber && parsed.data.invoiceNumber.trim() !== ''
        ? parsed.data.invoiceNumber.trim()
        : generatePurchaseInvoiceNumber();

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          merchantId,
          userId,
          invoiceNumber,
          totalAmount,
        },
      });

      for (const item of detailedItems) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.product.id,
            quantity: item.quantity,
            cost: item.cost,
            subtotal: item.subtotal,
          },
        });

        if (item.product.stock) {
          await tx.stock.update({
            where: {
              id: item.product.stock.id,
            },
            data: {
              actualQuantity: {
                increment: item.quantity,
              },
            },
          });
        } else {
          await tx.stock.create({
            data: {
              merchantId,
              productId: item.product.id,
              actualQuantity: item.quantity,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'CREATE_PURCHASE',
          entity: 'Purchase',
          entityId: purchase.id,
          description: `Pembelian ${purchase.invoiceNumber || '-'} berhasil dibuat dengan total ${totalAmount}`,
        },
      });

      return purchase;
    });

    const purchaseDetail = await prisma.purchase.findUnique({
      where: {
        id: result.id,
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Pembelian berhasil dibuat',
      data: {
        purchaseId: result.id.toString(),
        invoiceNumber: result.invoiceNumber,
        totalAmount: Number(result.totalAmount),
        user: purchaseDetail?.user
          ? {
              id: purchaseDetail.user.id.toString(),
              name: purchaseDetail.user.name,
              email: purchaseDetail.user.email,
            }
          : null,
        items:
          purchaseDetail?.items.map((item) => ({
            purchaseItemId: item.id.toString(),
            productId: item.product.id.toString(),
            productName: item.product.name,
            quantity: item.quantity,
            cost: Number(item.cost),
            subtotal: Number(item.subtotal),
          })) ?? [],
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    console.error('createPurchase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getPurchases(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Header x-merchant-id tidak valid',
      });
    }

    const searchRaw = req.query.search;
    const search = Array.isArray(searchRaw) ? searchRaw[0] : searchRaw;

    const purchases = await prisma.purchase.findMany({
      where: {
        merchantId,
        ...(search
          ? {
              invoiceNumber: {
                contains: String(search),
              },
            }
          : {}),
      },
      include: {
        user: true,
        items: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: purchases.map((item) => ({
        purchaseId: item.id.toString(),
        invoiceNumber: item.invoiceNumber,
        totalAmount: Number(item.totalAmount),
        totalItems: item.items.length,
        user: item.user
          ? {
              id: item.user.id.toString(),
              name: item.user.name,
              email: item.user.email,
            }
          : null,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error('getPurchases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getPurchaseDetail(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    const purchaseIdRaw = getSingleParam(req.params.id);

    if (!merchantId || !purchaseIdRaw || !/^\d+$/.test(purchaseIdRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Data request tidak valid',
      });
    }

    const purchaseId = BigInt(purchaseIdRaw);

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        merchantId,
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Data pembelian tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        purchaseId: purchase.id.toString(),
        invoiceNumber: purchase.invoiceNumber,
        totalAmount: Number(purchase.totalAmount),
        user: purchase.user
          ? {
              id: purchase.user.id.toString(),
              name: purchase.user.name,
              email: purchase.user.email,
            }
          : null,
        items: purchase.items.map((item) => ({
          purchaseItemId: item.id.toString(),
          productId: item.product.id.toString(),
          productName: item.product.name,
          quantity: item.quantity,
          cost: Number(item.cost),
          subtotal: Number(item.subtotal),
        })),
        createdAt: purchase.createdAt,
      },
    });
  } catch (error) {
    console.error('getPurchaseDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}