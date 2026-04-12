import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createCategorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
});

const updateCategorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
});

const createUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi'),
});

const updateUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi'),
});

const createProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  sku: z.string().optional(),
  categoryId: z.union([z.string(), z.number(), z.null()]).optional(),
  unitId: z.union([z.string(), z.number(), z.null()]).optional(),
  price: z.union([z.string(), z.number()]),
  reorderPoint: z.union([z.string(), z.number()]).optional(),
  initialStock: z.union([z.string(), z.number()]).optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').optional(),
  sku: z.string().optional(),
  categoryId: z.union([z.string(), z.number(), z.null()]).optional(),
  unitId: z.union([z.string(), z.number(), z.null()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  reorderPoint: z.union([z.string(), z.number()]).optional(),
  status: z.enum(['active', 'inactive']).optional(),
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

function parseOptionalBigInt(value: unknown): bigint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const stringValue = String(value);
  if (!/^\d+$/.test(stringValue)) return undefined;

  return BigInt(stringValue);
}

function parseNumberValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;

  return parsed;
}

/* =========================
   CATEGORY (MODIFIED - GLOBAL)
========================= */

export async function createCategory(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);

    if (!authUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });
    }

    const parsed = createCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
    }

    // mode insensitive dan equals sudah dihapus
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: parsed.data.name
      },
    });

    if (existingCategory) {
      return res.status(409).json({ success: false, message: 'Kategori sudah ada di sistem' });
    }

    const userId = BigInt(authUser.userId);

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          merchantId,
          name: parsed.data.name,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'CREATE_CATEGORY',
          entity: 'Category',
          entityId: created.id,
          description: `Kategori ${created.name} berhasil dibuat`,
        },
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: 'Kategori berhasil dibuat',
      data: {
        id: category.id.toString(),
        name: category.name,
      },
    });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function getCategories(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: categories.map((item) => ({
        id: item.id.toString(),
        name: item.name,
      })),
    });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const categoryIdRaw = getSingleParam(req.params.id);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId || !categoryIdRaw || !/^\d+$/.test(categoryIdRaw)) {
      return res.status(400).json({ success: false, message: 'Data request tidak valid' });
    }

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });

    const categoryId = BigInt(categoryIdRaw);
    const userId = BigInt(authUser.userId);

    const category = await prisma.category.findFirst({
      where: { id: categoryId, merchantId },
    });

    if (!category) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya' });

    // mode insensitive dan equals sudah dihapus
    const duplicate = await prisma.category.findFirst({
      where: {
        name: parsed.data.name,
        NOT: { id: categoryId },
      },
    });

    if (duplicate) return res.status(409).json({ success: false, message: 'Nama kategori sudah digunakan di sistem' });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.category.update({
        where: { id: categoryId },
        data: { name: parsed.data.name },
      });

      await tx.auditLog.create({
        data: { merchantId, userId, action: 'UPDATE_CATEGORY', entity: 'Category', entityId: result.id, description: `Kategori diperbarui menjadi ${result.name}` },
      });
      return result;
    });

    return res.status(200).json({
      success: true, message: 'Kategori berhasil diperbarui',
      data: { id: updated.id.toString(), name: updated.name },
    });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const categoryIdRaw = getSingleParam(req.params.id);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId || !categoryIdRaw || !/^\d+$/.test(categoryIdRaw)) {
      return res.status(400).json({ success: false, message: 'Data request tidak valid' });
    }

    const categoryId = BigInt(categoryIdRaw);
    const userId = BigInt(authUser.userId);

    const category = await prisma.category.findFirst({
      where: { id: categoryId, merchantId },
    });

    if (!category) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan atau Anda tidak berhak menghapusnya' });

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id: categoryId } });
      await tx.auditLog.create({
        data: { merchantId, userId, action: 'DELETE_CATEGORY', entity: 'Category', entityId: categoryId, description: `Kategori ${category.name} dihapus` },
      });
    });

    return res.status(200).json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Kategori tidak bisa dihapus karena masih dipakai di produk' });
  }
}

/* =========================
   UNIT (MODIFIED - GLOBAL)
========================= */

export async function createUnit(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId) return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });

    const parsed = createUnitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });

    // mode insensitive dan equals sudah dihapus
    const existingUnit = await prisma.unit.findFirst({
      where: { name: parsed.data.name },
    });

    if (existingUnit) return res.status(409).json({ success: false, message: 'Unit sudah ada di sistem' });

    const userId = BigInt(authUser.userId);

    const unit = await prisma.$transaction(async (tx) => {
      const created = await tx.unit.create({
        data: { merchantId, name: parsed.data.name },
      });

      await tx.auditLog.create({
        data: { merchantId, userId, action: 'CREATE_UNIT', entity: 'Unit', entityId: created.id, description: `Unit ${created.name} berhasil dibuat` },
      });
      return created;
    });

    return res.status(201).json({
      success: true, message: 'Unit berhasil dibuat',
      data: { id: unit.id.toString(), name: unit.name },
    });
  } catch (error) {
    console.error('createUnit error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function getUnits(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    if (!merchantId) return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });

    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: units.map((item) => ({ id: item.id.toString(), name: item.name })),
    });
  } catch (error) {
    console.error('getUnits error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function updateUnit(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const unitIdRaw = getSingleParam(req.params.id);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId || !unitIdRaw || !/^\d+$/.test(unitIdRaw)) return res.status(400).json({ success: false, message: 'Data request tidak valid' });

    const parsed = updateUnitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });

    const unitId = BigInt(unitIdRaw);
    const userId = BigInt(authUser.userId);

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, merchantId },
    });

    if (!unit) return res.status(404).json({ success: false, message: 'Unit tidak ditemukan atau tidak berhak diakses' });

    // mode insensitive dan equals sudah dihapus
    const duplicate = await prisma.unit.findFirst({
      where: {
        name: parsed.data.name,
        NOT: { id: unitId },
      },
    });

    if (duplicate) return res.status(409).json({ success: false, message: 'Nama unit sudah digunakan di sistem' });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.unit.update({
        where: { id: unitId },
        data: { name: parsed.data.name },
      });

      await tx.auditLog.create({
        data: { merchantId, userId, action: 'UPDATE_UNIT', entity: 'Unit', entityId: result.id, description: `Unit diperbarui menjadi ${result.name}` },
      });
      return result;
    });

    return res.status(200).json({
      success: true, message: 'Unit berhasil diperbarui',
      data: { id: updated.id.toString(), name: updated.name },
    });
  } catch (error) {
    console.error('updateUnit error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
}

export async function deleteUnit(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const unitIdRaw = getSingleParam(req.params.id);

    if (!authUser) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!merchantId || !unitIdRaw || !/^\d+$/.test(unitIdRaw)) return res.status(400).json({ success: false, message: 'Data request tidak valid' });

    const unitId = BigInt(unitIdRaw);
    const userId = BigInt(authUser.userId);

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, merchantId },
    });

    if (!unit) return res.status(404).json({ success: false, message: 'Unit tidak ditemukan atau tidak berhak dihapus' });

    await prisma.$transaction(async (tx) => {
      await tx.unit.delete({ where: { id: unitId } });
      await tx.auditLog.create({
        data: { merchantId, userId, action: 'DELETE_UNIT', entity: 'Unit', entityId: unitId, description: `Unit ${unit.name} dihapus` },
      });
    });

    return res.status(200).json({ success: true, message: 'Unit berhasil dihapus' });
  } catch (error) {
    console.error('deleteUnit error:', error);
    return res.status(500).json({ success: false, message: 'Unit tidak bisa dihapus karena masih dipakai di produk' });
  }
}

/* =========================
   PRODUCT (ORIGINAL)
========================= */

export async function createProduct(req: Request, res: Response) {
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

    const parsed = createProductSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const categoryId = parseOptionalBigInt(parsed.data.categoryId);
    const unitId = parseOptionalBigInt(parsed.data.unitId);
    const price = parseNumberValue(parsed.data.price);
    const reorderPoint = parseNumberValue(parsed.data.reorderPoint) ?? 5;
    const initialStock = parseNumberValue(parsed.data.initialStock) ?? 0;

    if (price === null || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Harga tidak valid',
      });
    }

    if (reorderPoint < 0 || initialStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reorder point atau stok awal tidak valid',
      });
    }

    if (parsed.data.categoryId !== undefined && parsed.data.categoryId !== null && categoryId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category ID tidak valid',
      });
    }

    if (parsed.data.unitId !== undefined && parsed.data.unitId !== null && unitId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID tidak valid',
      });
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan',
        });
      }
    }

    if (unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId,
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit tidak ditemukan',
        });
      }
    }

    if (parsed.data.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          merchantId,
          sku: parsed.data.sku,
        },
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: 'SKU sudah digunakan',
        });
      }
    }

    const userId = BigInt(authUser.userId);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          merchantId,
          categoryId: categoryId ?? null,
          unitId: unitId ?? null,
          name: parsed.data.name,
          sku: parsed.data.sku || null,
          price,
          reorderPoint,
          status: 'active',
        },
        include: {
          category: true,
          unit: true,
        },
      });

      const stock = await tx.stock.create({
        data: {
          merchantId,
          productId: product.id,
          quantity: initialStock,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'CREATE_PRODUCT',
          entity: 'Product',
          entityId: product.id,
          description: `Produk ${product.name} berhasil dibuat`,
        },
      });

      return {
        product,
        stock,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Produk berhasil dibuat',
      data: {
        id: result.product.id.toString(),
        name: result.product.name,
        sku: result.product.sku,
        price: Number(result.product.price),
        reorderPoint: result.product.reorderPoint,
        status: result.product.status,
        stock: result.stock.quantity,
        category: result.product.category
          ? {
              id: result.product.category.id.toString(),
              name: result.product.category.name,
            }
          : null,
        unit: result.product.unit
          ? {
              id: result.product.unit.id.toString(),
              name: result.product.unit.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getProducts(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Header x-merchant-id tidak valid',
      });
    }

    const searchRaw = req.query.search;
    const categoryIdRaw = req.query.categoryId;
    const statusRaw = req.query.status;

    const search = Array.isArray(searchRaw) ? searchRaw[0] : searchRaw;
    const categoryIdString = Array.isArray(categoryIdRaw) ? categoryIdRaw[0] : categoryIdRaw;
    const status = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;

    let categoryId: bigint | undefined;

    if (categoryIdString) {
      if (!/^\d+$/.test(String(categoryIdString))) {
        return res.status(400).json({
          success: false,
          message: 'categoryId tidak valid',
        });
      }
      categoryId = BigInt(String(categoryIdString));
    }

    const products = await prisma.product.findMany({
      where: {
        merchantId,
        ...(search
          ? {
              name: {
                contains: String(search),
              },
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(status === 'active' || status === 'inactive' ? { status } : {}),
      },
      include: {
        category: true,
        unit: true,
        stock: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: products.map((item) => ({
        id: item.id.toString(),
        name: item.name,
        sku: item.sku,
        price: Number(item.price),
        reorderPoint: item.reorderPoint,
        status: item.status,
        stock: item.stock?.quantity ?? 0,
        category: item.category
          ? {
              id: item.category.id.toString(),
              name: item.category.name,
            }
          : null,
        unit: item.unit
          ? {
              id: item.unit.id.toString(),
              name: item.unit.name,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function getProductDetail(req: Request, res: Response) {
  try {
    const merchantId = getMerchantIdFromHeader(req);
    const productIdRaw = getSingleParam(req.params.id);

    if (!merchantId || !productIdRaw || !/^\d+$/.test(productIdRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Data request tidak valid',
      });
    }

    const productId = BigInt(productIdRaw);

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId,
      },
      include: {
        category: true,
        unit: true,
        stock: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: product.id.toString(),
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        reorderPoint: product.reorderPoint,
        status: product.status,
        stock: product.stock?.quantity ?? 0,
        category: product.category
          ? {
              id: product.category.id.toString(),
              name: product.category.name,
            }
          : null,
        unit: product.unit
          ? {
              id: product.unit.id.toString(),
              name: product.unit.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('getProductDetail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const productIdRaw = getSingleParam(req.params.id);

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

    const parsed = updateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Validasi gagal',
      });
    }

    const productId = BigInt(productIdRaw);
    const userId = BigInt(authUser.userId);

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    const categoryId = parseOptionalBigInt(parsed.data.categoryId);
    const unitId = parseOptionalBigInt(parsed.data.unitId);
    const price = parsed.data.price !== undefined ? parseNumberValue(parsed.data.price) : undefined;
    const reorderPoint =
      parsed.data.reorderPoint !== undefined
        ? parseNumberValue(parsed.data.reorderPoint)
        : undefined;

    if (parsed.data.categoryId !== undefined && parsed.data.categoryId !== null && categoryId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category ID tidak valid',
      });
    }

    if (parsed.data.unitId !== undefined && parsed.data.unitId !== null && unitId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID tidak valid',
      });
    }

    if (price !== undefined && (price === null || price < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Harga tidak valid',
      });
    }

    if (reorderPoint !== undefined && (reorderPoint === null || reorderPoint < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Reorder point tidak valid',
      });
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan',
        });
      }
    }

    if (unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId,
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit tidak ditemukan',
        });
      }
    }

    if (parsed.data.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: {
          merchantId,
          sku: parsed.data.sku,
          NOT: {
            id: productId,
          },
        },
      });

      if (duplicateSku) {
        return res.status(409).json({
          success: false,
          message: 'SKU sudah digunakan',
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.sku !== undefined ? { sku: parsed.data.sku || null } : {}),
          ...(parsed.data.categoryId !== undefined ? { categoryId: categoryId ?? null } : {}),
          ...(parsed.data.unitId !== undefined ? { unitId: unitId ?? null } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(reorderPoint !== undefined ? { reorderPoint } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        },
        include: {
          category: true,
          unit: true,
          stock: true,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'UPDATE_PRODUCT',
          entity: 'Product',
          entityId: product.id,
          description: `Produk ${product.name} berhasil diperbarui`,
        },
      });

      return product;
    });

    return res.status(200).json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: {
        id: updated.id.toString(),
        name: updated.name,
        sku: updated.sku,
        price: Number(updated.price),
        reorderPoint: updated.reorderPoint,
        status: updated.status,
        stock: updated.stock?.quantity ?? 0,
        category: updated.category
          ? {
              id: updated.category.id.toString(),
              name: updated.category.name,
            }
          : null,
        unit: updated.unit
          ? {
              id: updated.unit.id.toString(),
              name: updated.unit.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}

export async function deactivateProduct(req: Request, res: Response) {
  try {
    const authUser = req.authUser;
    const merchantId = getMerchantIdFromHeader(req);
    const productIdRaw = getSingleParam(req.params.id);

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

    const userId = BigInt(authUser.userId);
    const productId = BigInt(productIdRaw);

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          status: 'inactive',
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'DEACTIVATE_PRODUCT',
          entity: 'Product',
          entityId: result.id,
          description: `Produk ${result.name} dinonaktifkan`,
        },
      });

      return result;
    });

    return res.status(200).json({
      success: true,
      message: 'Produk berhasil dinonaktifkan',
      data: {
        id: updated.id.toString(),
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('deactivateProduct error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
}