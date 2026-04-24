import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Header x-merchant-id tidak valid',
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      totalCategories,
      totalUsers,
      totalStocks,
      lowStockProducts,
      todaySalesAgg,
      monthSalesAgg,
      monthPurchaseAgg,
      recentSales,
      lowStockList,
    ] = await Promise.all([
      prisma.product.count({
        where: {
          merchantId,
          status: 'active',
        },
      }),
      prisma.category.count({
        where: {
          merchantId,
        },
      }),
      prisma.merchantUser.count({
        where: {
          merchantId,
          status: 'active',
        },
      }),
      prisma.stock.aggregate({
        where: {
          merchantId,
        },
        _sum: {
          actualQuantity: true,
        },
      }),
      prisma.stock.findMany({
        where: {
          merchantId,
        },
        include: {
          product: true,
        },
      }),
      prisma.sale.aggregate({
        where: {
          merchantId,
          createdAt: {
            gte: startOfToday,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.sale.aggregate({
        where: {
          merchantId,
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.purchase.aggregate({
        where: {
          merchantId,
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          merchantId,
        },
        include: {
          cashier: true,
          items: true,
        },
        orderBy: {
          id: 'desc',
        },
        take: 5,
      }),
      prisma.stock.findMany({
        where: {
          merchantId,
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
          updatedAt: 'desc',
        },
      }),
    ]);

    const lowStockCount = lowStockProducts.filter(
      (item) => item.actualQuantity <= item.product.reorderPoint
    ).length;

    const lowStockItems = lowStockList
      .filter((item) => item.actualQuantity <= item.product.reorderPoint)
      .slice(0, 10)
      .map((item) => ({
        productId: item.product.id.toString(),
        productName: item.product.name,
        sku: item.product.sku,
        actualQuantity: item.actualQuantity,
        reorderPoint: item.product.reorderPoint,
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
      }));

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalProducts,
          totalCategories,
          totalUsers,
          totalStockQuantity: totalStocks._sum.actualQuantity ?? 0,
          lowStockCount,
          todaySales: Number(todaySalesAgg._sum.totalAmount ?? 0),
          monthSales: Number(monthSalesAgg._sum.totalAmount ?? 0),
          monthPurchases: Number(monthPurchaseAgg._sum.totalAmount ?? 0),
        },
        recentSales: recentSales.map((sale) => ({
          saleId: sale.id.toString(),
          invoiceNumber: sale.invoiceNumber,
          totalAmount: Number(sale.totalAmount),
          totalItems: sale.items.length,
          cashier: sale.cashier
            ? {
                id: sale.cashier.id.toString(),
                name: sale.cashier.name,
              }
            : null,
          createdAt: sale.createdAt,
        })),
        lowStockItems,
      },
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}