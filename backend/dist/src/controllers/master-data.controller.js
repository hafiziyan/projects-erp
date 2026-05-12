"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategory = createCategory;
exports.getCategories = getCategories;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
exports.createUnit = createUnit;
exports.getUnits = getUnits;
exports.updateUnit = updateUnit;
exports.deleteUnit = deleteUnit;
exports.createProduct = createProduct;
exports.getProducts = getProducts;
exports.getProductDetail = getProductDetail;
exports.updateProduct = updateProduct;
exports.deactivateProduct = deactivateProduct;
exports.activateProduct = activateProduct;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nama kategori minimal 2 karakter'),
});
const updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nama kategori minimal 2 karakter'),
});
const createUnitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama unit wajib diisi'),
});
const updateUnitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama unit wajib diisi'),
});
const createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nama produk minimal 2 karakter'),
    sku: zod_1.z.string().optional(),
    categoryId: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional(),
    unitId: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional(),
    price: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    reorderPoint: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    initialStock: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
const updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nama produk minimal 2 karakter').optional(),
    sku: zod_1.z.string().optional(),
    categoryId: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional(),
    unitId: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional(),
    price: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    reorderPoint: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
function getMerchantIdFromHeader(req) {
    const merchantIdHeader = req.headers['x-merchant-id'];
    if (!merchantIdHeader)
        return null;
    const merchantIdValue = Array.isArray(merchantIdHeader)
        ? merchantIdHeader[0]
        : merchantIdHeader;
    if (!merchantIdValue)
        return null;
    if (!/^\d+$/.test(merchantIdValue))
        return null;
    return BigInt(merchantIdValue);
}
function getSingleParam(param) {
    if (!param)
        return null;
    return Array.isArray(param) ? param[0] ?? null : param;
}
function parseOptionalBigInt(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const stringValue = String(value);
    if (!/^\d+$/.test(stringValue))
        return undefined;
    return BigInt(stringValue);
}
function parseNumberValue(value) {
    if (value === undefined || value === null || value === '')
        return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed))
        return null;
    return parsed;
}
/* =========================
   CATEGORY (MODIFIED - GLOBAL)
========================= */
async function createCategory(req, res) {
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
        const existingCategory = await prisma_1.prisma.category.findFirst({
            where: {
                name: parsed.data.name
            },
        });
        if (existingCategory) {
            return res.status(409).json({ success: false, message: 'Kategori sudah ada di sistem' });
        }
        const userId = BigInt(authUser.userId);
        const category = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('createCategory error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function getCategories(req, res) {
    try {
        const merchantId = getMerchantIdFromHeader(req);
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });
        }
        // [PERBAIKAN]: where: { merchantId } DIHAPUS agar query menarik data global
        const categories = await prisma_1.prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
        return res.status(200).json({
            success: true,
            data: categories.map((item) => ({
                id: item.id.toString(),
                name: item.name,
            })),
        });
    }
    catch (error) {
        console.error('getCategories error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function updateCategory(req, res) {
    try {
        const authUser = req.authUser;
        const merchantId = getMerchantIdFromHeader(req);
        const categoryIdRaw = getSingleParam(req.params.id);
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!merchantId || !categoryIdRaw || !/^\d+$/.test(categoryIdRaw)) {
            return res.status(400).json({ success: false, message: 'Data request tidak valid' });
        }
        const parsed = updateCategorySchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
        const categoryId = BigInt(categoryIdRaw);
        const userId = BigInt(authUser.userId);
        const category = await prisma_1.prisma.category.findFirst({
            where: { id: categoryId, merchantId },
        });
        if (!category)
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan atau Anda tidak memiliki akses untuk mengubahnya' });
        const duplicate = await prisma_1.prisma.category.findFirst({
            where: {
                name: parsed.data.name,
                NOT: { id: categoryId },
            },
        });
        if (duplicate)
            return res.status(409).json({ success: false, message: 'Nama kategori sudah digunakan di sistem' });
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('updateCategory error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function deleteCategory(req, res) {
    try {
        const authUser = req.authUser;
        const merchantId = getMerchantIdFromHeader(req);
        const categoryIdRaw = getSingleParam(req.params.id);
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!merchantId || !categoryIdRaw || !/^\d+$/.test(categoryIdRaw)) {
            return res.status(400).json({ success: false, message: 'Data request tidak valid' });
        }
        const categoryId = BigInt(categoryIdRaw);
        const userId = BigInt(authUser.userId);
        const category = await prisma_1.prisma.category.findFirst({
            where: { id: categoryId, merchantId },
        });
        if (!category)
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan atau Anda tidak berhak menghapusnya' });
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.category.delete({ where: { id: categoryId } });
            await tx.auditLog.create({
                data: { merchantId, userId, action: 'DELETE_CATEGORY', entity: 'Category', entityId: categoryId, description: `Kategori ${category.name} dihapus` },
            });
        });
        return res.status(200).json({ success: true, message: 'Kategori berhasil dihapus' });
    }
    catch (error) {
        console.error('deleteCategory error:', error);
        return res.status(500).json({ success: false, message: 'Kategori tidak bisa dihapus karena masih dipakai di produk' });
    }
}
/* =========================
   UNIT (MODIFIED - GLOBAL)
========================= */
async function createUnit(req, res) {
    try {
        const authUser = req.authUser;
        const merchantId = getMerchantIdFromHeader(req);
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!merchantId)
            return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });
        const parsed = createUnitSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
        const existingUnit = await prisma_1.prisma.unit.findFirst({
            where: { name: parsed.data.name },
        });
        if (existingUnit)
            return res.status(409).json({ success: false, message: 'Unit sudah ada di sistem' });
        const userId = BigInt(authUser.userId);
        const unit = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('createUnit error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function getUnits(req, res) {
    try {
        const merchantId = getMerchantIdFromHeader(req);
        if (!merchantId)
            return res.status(400).json({ success: false, message: 'Header x-merchant-id tidak valid' });
        // [PERBAIKAN]: where: { merchantId } DIHAPUS agar query menarik data global
        const units = await prisma_1.prisma.unit.findMany({
            orderBy: { name: 'asc' },
        });
        return res.status(200).json({
            success: true,
            data: units.map((item) => ({ id: item.id.toString(), name: item.name })),
        });
    }
    catch (error) {
        console.error('getUnits error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function updateUnit(req, res) {
    try {
        const authUser = req.authUser;
        const merchantId = getMerchantIdFromHeader(req);
        const unitIdRaw = getSingleParam(req.params.id);
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!merchantId || !unitIdRaw || !/^\d+$/.test(unitIdRaw))
            return res.status(400).json({ success: false, message: 'Data request tidak valid' });
        const parsed = updateUnitSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Validasi gagal' });
        const unitId = BigInt(unitIdRaw);
        const userId = BigInt(authUser.userId);
        const unit = await prisma_1.prisma.unit.findFirst({
            where: { id: unitId, merchantId },
        });
        if (!unit)
            return res.status(404).json({ success: false, message: 'Unit tidak ditemukan atau tidak berhak diakses' });
        const duplicate = await prisma_1.prisma.unit.findFirst({
            where: {
                name: parsed.data.name,
                NOT: { id: unitId },
            },
        });
        if (duplicate)
            return res.status(409).json({ success: false, message: 'Nama unit sudah digunakan di sistem' });
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('updateUnit error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
}
async function deleteUnit(req, res) {
    try {
        const authUser = req.authUser;
        const merchantId = getMerchantIdFromHeader(req);
        const unitIdRaw = getSingleParam(req.params.id);
        if (!authUser)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!merchantId || !unitIdRaw || !/^\d+$/.test(unitIdRaw))
            return res.status(400).json({ success: false, message: 'Data request tidak valid' });
        const unitId = BigInt(unitIdRaw);
        const userId = BigInt(authUser.userId);
        const unit = await prisma_1.prisma.unit.findFirst({
            where: { id: unitId, merchantId },
        });
        if (!unit)
            return res.status(404).json({ success: false, message: 'Unit tidak ditemukan atau tidak berhak dihapus' });
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.unit.delete({ where: { id: unitId } });
            await tx.auditLog.create({
                data: { merchantId, userId, action: 'DELETE_UNIT', entity: 'Unit', entityId: unitId, description: `Unit ${unit.name} dihapus` },
            });
        });
        return res.status(200).json({ success: true, message: 'Unit berhasil dihapus' });
    }
    catch (error) {
        console.error('deleteUnit error:', error);
        return res.status(500).json({ success: false, message: 'Unit tidak bisa dihapus karena masih dipakai di produk' });
    }
}
/* =========================
   PRODUCT (ORIGINAL)
========================= */
async function createProduct(req, res) {
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
            const category = await prisma_1.prisma.category.findFirst({
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
            const unit = await prisma_1.prisma.unit.findFirst({
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
            const existingSku = await prisma_1.prisma.product.findFirst({
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
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
                    actualQuantity: initialStock,
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
                stock: result.stock.actualQuantity,
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
    }
    catch (error) {
        console.error('createProduct error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
async function getProducts(req, res) {
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
        let categoryId;
        if (categoryIdString) {
            if (!/^\d+$/.test(String(categoryIdString))) {
                return res.status(400).json({
                    success: false,
                    message: 'categoryId tidak valid',
                });
            }
            categoryId = BigInt(String(categoryIdString));
        }
        const products = await prisma_1.prisma.product.findMany({
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
                stock: item.stock?.actualQuantity ?? 0,
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
    }
    catch (error) {
        console.error('getProducts error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
async function getProductDetail(req, res) {
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
        const product = await prisma_1.prisma.product.findFirst({
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
                stock: product.stock?.actualQuantity ?? 0,
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
    }
    catch (error) {
        console.error('getProductDetail error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
async function updateProduct(req, res) {
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
        const existingProduct = await prisma_1.prisma.product.findFirst({
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
        const reorderPoint = parsed.data.reorderPoint !== undefined
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
            const category = await prisma_1.prisma.category.findFirst({
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
            const unit = await prisma_1.prisma.unit.findFirst({
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
            const duplicateSku = await prisma_1.prisma.product.findFirst({
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
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
                stock: updated.stock?.actualQuantity ?? 0,
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
    }
    catch (error) {
        console.error('updateProduct error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
async function deactivateProduct(req, res) {
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
        const product = await prisma_1.prisma.product.findFirst({
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
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error('deactivateProduct error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
async function activateProduct(req, res) {
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
        const product = await prisma_1.prisma.product.findFirst({
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
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const result = await tx.product.update({
                where: {
                    id: productId,
                },
                data: {
                    status: 'active',
                },
            });
            await tx.auditLog.create({
                data: {
                    merchantId,
                    userId,
                    action: 'ACTIVATE_PRODUCT',
                    entity: 'Product',
                    entityId: result.id,
                    description: `Produk ${result.name} diaktifkan kembali`,
                },
            });
            return result;
        });
        return res.status(200).json({
            success: true,
            message: 'Produk berhasil diaktifkan',
            data: {
                id: updated.id.toString(),
                status: updated.status,
            },
        });
    }
    catch (error) {
        console.error('activateProduct error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
        });
    }
}
