import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createSaleSchema = z.object({
  paymentMethod: z.string().min(1, 'Metode pembayaran wajib diisi'),
  discountAmount: z.union([z.string(), z.number()]).optional(),
  items: z.array(
    z.object({
      productId: z.union([z.string(), z.number()]),
      quantity: z.union([z.string(), z.number()]),
      productNameSnapshot: z.string().optional(),
      skuSnapshot: z.string().nullable().optional(),
      priceSnapshot: z.union([z.string(), z.number()]).optional(),
    })
  ).min(1, 'Minimal ada 1 item penjualan'),
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

function generateInvoiceNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;

  return `INV-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

export async function createSale(req: Request, res: Response) {
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

    const parsed = createSaleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const cashierUserId = BigInt(authUser.userId);
    const discountAmount = parseNumberValue(parsed.data.discountAmount) ?? 0;

    if (discountAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Diskon tidak valid',
      });
    }

    const normalizedItems = parsed.data.items.map((item) => {
      const productId = parseInteger(item.productId);
      const quantity = parseInteger(item.quantity);

      return {
        productId,
        quantity,
        productNameSnapshot: item.productNameSnapshot,
        skuSnapshot: item.skuSnapshot ?? null,
        priceSnapshot: parseNumberValue(item.priceSnapshot),
      };
    });

    if (normalizedItems.some((item) => item.productId === null || item.quantity === null || item.quantity! <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Data item penjualan tidak valid',
      });
    }

    const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId as number))).map((productId) => BigInt(productId));

    const products = await prisma.product.findMany({
      where: {
        merchantId,
        id: {
          in: productIds,
        },
        status: 'active',
      },
      include: {
        stock: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Ada produk yang tidak ditemukan atau tidak aktif',
      });
    }

    let subtotal = 0;
    const requestedQuantityByProductId = new Map<string, number>();

    for (const item of normalizedItems) {
      const productId = String(item.productId);
      requestedQuantityByProductId.set(productId, (requestedQuantityByProductId.get(productId) || 0) + (item.quantity as number));
    }

    for (const product of products) {
      const requestedQuantity = requestedQuantityByProductId.get(product.id.toString()) || 0;
      if (!product.stock) {
        throw new Error('STOCK_NOT_FOUND');
      }
      if (product.stock.actualQuantity < requestedQuantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
      }
    }

    const detailedItems = normalizedItems.map((item) => {
      const product = products.find(
        (p) => p.id.toString() === String(item.productId)
      );

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const price = Number(product.price);
      const itemSubtotal = price * (item.quantity as number);
      subtotal += itemSubtotal;

      return {
        product,
        quantity: item.quantity as number,
        price,
        subtotal: itemSubtotal,
        productNameSnapshot: item.productNameSnapshot || product.name,
        skuSnapshot: item.skuSnapshot ?? product.sku,
      };
    });

    if (discountAmount > subtotal) {
      return res.status(400).json({
        success: false,
        message: 'Diskon tidak boleh lebih besar dari subtotal',
      });
    }

    const totalAmount = subtotal - discountAmount;
    const invoiceNumber = generateInvoiceNumber();

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          merchantId,
          cashierUserId,
          invoiceNumber,
          subtotal,
          discountAmount,
          totalAmount,
          paymentMethod: parsed.data.paymentMethod,
        },
      });

      const stockQuantityByProductId = new Map<string, number>();

      for (const item of detailedItems) {
        const productId = item.product.id.toString();
        stockQuantityByProductId.set(productId, (stockQuantityByProductId.get(productId) || 0) + item.quantity);

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.product.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            ...( {
              productNameSnapshot: item.productNameSnapshot,
              skuSnapshot: item.skuSnapshot,
            } as any ),
          },
        });

      }

      for (const [productId, quantity] of stockQuantityByProductId) {
        await tx.stock.update({
          where: {
            productId: BigInt(productId),
          },
          data: {
            actualQuantity: {
              decrement: quantity,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          merchantId,
          userId: cashierUserId,
          action: 'CREATE_SALE',
          entity: 'Sale',
          entityId: sale.id,
          description: `Penjualan ${sale.invoiceNumber} berhasil dibuat dengan total ${totalAmount}`,
        },
      });

      return sale;
    });

    const saleDetail = await prisma.sale.findUnique({
      where: {
        id: result.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        cashier: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Transaksi penjualan berhasil dibuat',
      data: {
        saleId: result.id.toString(),
        invoiceNumber: result.invoiceNumber,
        subtotal: Number(result.subtotal),
        discountAmount: Number(result.discountAmount),
        totalAmount: Number(result.totalAmount),
        paymentMethod: result.paymentMethod,
        cashier: saleDetail?.cashier
          ? {
              id: saleDetail.cashier.id.toString(),
              name: saleDetail.cashier.name,
              email: saleDetail.cashier.email,
            }
          : null,
        items:
          saleDetail?.items.map((item) => {
            const snapshotItem = item as typeof item & {
              productNameSnapshot?: string | null;
              skuSnapshot?: string | null;
            };

            return {
              saleItemId: item.id.toString(),
              productId: item.product.id.toString(),
              productName: snapshotItem.productNameSnapshot || item.product.name,
              sku: snapshotItem.skuSnapshot ?? item.product.sku,
              quantity: item.quantity,
              price: Number(item.price),
              subtotal: Number(item.subtotal),
              imageUrl: item.product.imageUrl,
            };
          }) ?? [],
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Produk tidak ditemukan',
        });
      }

      if (error.message === 'STOCK_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Data stok produk tidak ditemukan',
        });
      }

      if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
        const productName = error.message.split(':')[1];
        return res.status(400).json({
          success: false,
          message: `Stok produk ${productName} tidak mencukupi`,
        });
      }
    }

    console.error('createSale error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getSales(req: Request, res: Response) {
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

    const sales = await prisma.sale.findMany({
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
        cashier: true,
        items: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: sales.map((item) => ({
        saleId: item.id.toString(),
        invoiceNumber: item.invoiceNumber,
        subtotal: Number(item.subtotal),
        discountAmount: Number(item.discountAmount),
        totalAmount: Number(item.totalAmount),
        paymentMethod: item.paymentMethod,
        totalItems: item.items.length,
        cashier: item.cashier
          ? {
              id: item.cashier.id.toString(),
              name: item.cashier.name,
              email: item.cashier.email,
            }
          : null,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error('getSales error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getSaleDetail(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    const saleIdRaw = getSingleParam(req.params.id);

    if (!merchantId || !saleIdRaw || !/^\d+$/.test(saleIdRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Data request tidak valid',
      });
    }

    const saleId = BigInt(saleIdRaw);

    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        merchantId,
      },
      include: {
        cashier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Data penjualan tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        saleId: sale.id.toString(),
        invoiceNumber: sale.invoiceNumber,
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discountAmount),
        totalAmount: Number(sale.totalAmount),
        paymentMethod: sale.paymentMethod,
        cashier: sale.cashier
          ? {
              id: sale.cashier.id.toString(),
              name: sale.cashier.name,
              email: sale.cashier.email,
            }
          : null,
        items: sale.items.map((item) => {
          const snapshotItem = item as typeof item & {
            productNameSnapshot?: string | null;
            skuSnapshot?: string | null;
          };

          return {
            saleItemId: item.id.toString(),
            productId: item.product.id.toString(),
            productName: snapshotItem.productNameSnapshot || item.product.name,
            sku: snapshotItem.skuSnapshot ?? item.product.sku,
            quantity: item.quantity,
            price: Number(item.price),
            subtotal: Number(item.subtotal),
            imageUrl: item.product.imageUrl,
          };
        }),
        createdAt: sale.createdAt,
      },
    });
  } catch (error) {
    console.error('getSaleDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}