import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Roles
  const rolesData = [
    { name: 'Owner', description: 'Pemilik merchant' },
    { name: 'Kasir', description: 'Petugas kasir POS' },
    { name: 'Gudang', description: 'Petugas inventaris dan stok' },
  ];

  const roles: any = {};
  for (const role of rolesData) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('Seed roles berhasil');

  // 2. Create Demo Merchant
  const merchant = await prisma.merchant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Toko Antigravity (Demo)',
      address: 'Jl. Antigravity No. 1',
      phone: '08123456789',
      status: 'active',
    },
  });
  console.log('Seed demo merchant berhasil');

  // 3. Create Demo Users
  const passwordHash = await bcrypt.hash('Password123', 10);
  const usersData = [
    { name: 'Demo Owner', email: 'owner@pos.com', role: 'Owner' },
    { name: 'Demo Kasir', email: 'kasir@pos.com', role: 'Kasir' },
    { name: 'Demo Gudang', email: 'gudang@pos.com', role: 'Gudang' },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: passwordHash },
      create: { name: u.name, email: u.email, password: passwordHash, status: 'active' },
    });

    await prisma.merchantUser.upsert({
      where: { merchantId_userId: { merchantId: merchant.id, userId: user.id } },
      update: { roleId: roles[u.role].id, status: 'active' },
      create: { merchantId: merchant.id, userId: user.id, roleId: roles[u.role].id, status: 'active' },
    });
  }
  console.log('Seed demo users berhasil');

  // 4. Seed Categories
  const categoriesData = ['Makanan', 'Minuman', 'Elektronik', 'Alat Tulis', 'Kebersihan'];
  const categories: any = {};
  for (const name of categoriesData) {
    categories[name] = await prisma.category.upsert({
      where: { merchantId_name: { merchantId: merchant.id, name } },
      update: {},
      create: { merchantId: merchant.id, name },
    });
  }
  console.log('Seed categories berhasil');

  // 5. Seed Units
  const unitsData = ['pcs', 'box', 'kg', 'liter'];
  const units: any = {};
  for (const name of unitsData) {
    units[name] = await prisma.unit.upsert({
      where: { merchantId_name: { merchantId: merchant.id, name } },
      update: {},
      create: { merchantId: merchant.id, name },
    });
  }
  console.log('Seed units berhasil');

  // 6. Seed 20 Products
  const productsData = [
    { name: 'Indomie Goreng', cat: 'Makanan', unit: 'pcs', price: 3500, stock: 100, reorder: 20 },
    { name: 'Beras Pandan Wangi', cat: 'Makanan', unit: 'kg', price: 15000, stock: 50, reorder: 10 },
    { name: 'Minyak Goreng 2L', cat: 'Makanan', unit: 'liter', price: 34000, stock: 30, reorder: 5 },
    { name: 'Gula Pasir 1kg', cat: 'Makanan', unit: 'kg', price: 17500, stock: 40, reorder: 10 },
    
    { name: 'Aqua 600ml', cat: 'Minuman', unit: 'pcs', price: 4000, stock: 120, reorder: 20 },
    { name: 'Teh Pucuk Harum', cat: 'Minuman', unit: 'pcs', price: 3500, stock: 60, reorder: 15 },
    { name: 'Coca Cola 1.5L', cat: 'Minuman', unit: 'pcs', price: 15000, stock: 24, reorder: 6 },
    { name: 'Susu UHT Full Cream', cat: 'Minuman', unit: 'liter', price: 20000, stock: 15, reorder: 4 },

    { name: 'Mouse Wireless Logi', cat: 'Elektronik', unit: 'pcs', price: 150000, stock: 10, reorder: 2 },
    { name: 'Keyboard Mechanical', cat: 'Elektronik', unit: 'pcs', price: 450000, stock: 5, reorder: 2 },
    { name: 'Kabel Data Type-C', cat: 'Elektronik', unit: 'pcs', price: 35000, stock: 40, reorder: 10 },
    { name: 'Powerbank 10000mAh', cat: 'Elektronik', unit: 'pcs', price: 250000, stock: 8, reorder: 3 },

    { name: 'Buku Tulis Sidu', cat: 'Alat Tulis', unit: 'box', price: 45000, stock: 12, reorder: 3 },
    { name: 'Pulpen Pilot Black', cat: 'Alat Tulis', unit: 'box', price: 24000, stock: 20, reorder: 5 },
    { name: 'Pensil 2B Faber', cat: 'Alat Tulis', unit: 'box', price: 18000, stock: 15, reorder: 4 },
    { name: 'Snelhefter Map', cat: 'Alat Tulis', unit: 'pcs', price: 5000, stock: 100, reorder: 20 },

    { name: 'Sapu Lantai Injuk', cat: 'Kebersihan', unit: 'pcs', price: 25000, stock: 15, reorder: 5 },
    { name: 'Wipol Karbol 750ml', cat: 'Kebersihan', unit: 'liter', price: 18000, stock: 20, reorder: 5 },
    { name: 'Sabun Cuci Piring', cat: 'Kebersihan', unit: 'liter', price: 12000, stock: 35, reorder: 10 },
    { name: 'Kain Pel Microfiber', cat: 'Kebersihan', unit: 'pcs', price: 35000, stock: 10, reorder: 2 },
  ];

  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i];
    const sku = `SKU-${1000 + i}`;
    const product = await prisma.product.upsert({
      where: { merchantId_sku: { merchantId: merchant.id, sku } },
      update: {
        price: p.price,
        reorderPoint: p.reorder,
      },
      create: {
        merchantId: merchant.id,
        categoryId: categories[p.cat].id,
        unitId: units[p.unit].id,
        name: p.name,
        sku,
        price: p.price,
        reorderPoint: p.reorder,
        status: 'active',
      },
    });

    await prisma.stock.upsert({
      where: { productId: product.id },
      update: { actualQuantity: p.stock },
      create: {
        merchantId: merchant.id,
        productId: product.id,
        actualQuantity: p.stock,
        reservedQuantity: 0,
      },
    });
  }
  console.log('Seed 20 products dummy berhasil');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });