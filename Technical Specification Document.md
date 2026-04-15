# Technical Specification Document - ERP Multi Merchant

## Project Overview
Projek ini adalah sistem ERP (Enterprise Resource Planning) Multi Merchant yang dirancang untuk membantu UMKM mengelola Point of Sale (POS), stok barang, dan manajemen merchant dalam satu platform.

## Technology Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, TypeScript.
- **Backend**: Node.js (Express), Prisma ORM, TypeScript.
- **Database**: MySQL.
- **Authentication**: JWT (JSON Web Token) dengan cookie-based storage.

## System Architecture
Projek ini dibagi menjadi dua bagian utama:
1. **Frontend**: Berjalan di `http://localhost:3000`. Menggunakan Next.js App Router.
2. **Backend**: Berjalan di `http://localhost:5000`. Menyediakan API RESTful untuk manajemen data.

## Database Schema (Prisma)
Beberapa model utama dalam database:
- `User`: Menyimpan data pengguna global.
- `Merchant`: Data entitas bisnis/toko (Sesuai PRD, Merchant berfungsi sebagai representasi **Branch/Cabang**).
- `MerchantUser`: Relasi antara User, Merchant, dan Role untuk mendukung akses Multi-Branch.
- `Product`, `Category`, `Unit`: Manajemen produk.
- `Stock`: Manajemen inventaris dengan pelacakan presisi (`actualQuantity` & `reservedQuantity`).
- `StockMutation`: Pencatatan log rekam jejak keluar masuk stok (Audit Trail Inventaris).
- `TransferRequest` & `TransferItem`: Siklus distribusi barang antar cabang (Pusat ke Cabang).
- `Sale`, `Purchase`: Transaksi penjualan (dengan sinkronisasi Offline Mode) dan pembelian.
- `AuditLog`: Pencatatan aktivitas sistem.

## Setup Instructions
1. **Repository**: `https://github.com/hafiziyan/projects-erp`
2. **Cloning**: `git clone` ke direktori lokal.
3. **Dependencies**: Jalan `npm install` di folder `frontend` dan `backend`.
4. **Environment Variables**:
   - Backend `.env`:
     ```
     DATABASE_URL="mysql://root:@localhost:3306/umkm_pos"
     JWT_SECRET="antigravity_secret"
     FRONTEND_URL="http://localhost:3000"
     PORT=5000
     ```
5. **Database Initialization**:
   - Pastikan MySQL berjalan.
   - Jalankan `npx prisma db push` di folder `backend`.
   - Jalankan `npm run seed` untuk data awal (Roles, Demo Merchant, Demo Users).
6. **Quick Login (Development Only)**:
   - Tersedia tombol shortcut pada halaman `/signin` untuk login sebagai **Owner**, **Kasir**, atau **Gudang**.
   - Kredensial demo:
     - Owner: `owner@pos.com` / `Password123`
     - Kasir: `kasir@pos.com` / `Password123`
     - Gudang: `gudang@pos.com` / `Password123`
7. **Running the App**:
   - Backend: `npm run dev` (Port 5000)
   - Frontend: `npm run dev` (Port 3000)

## API Endpoints
- `/api/auth`: Login, Signup, Logout, Me.
- `/api/merchants`: Manajemen merchant.
- `/api/stocks`: Manajemen stok barang.
- `/api/sales`: Transaksi POS.
- `/api/dashboard`: Summary metrics dan analytics.
- `/api/master`: Category dan Unit produk.

## Advanced Dashboard Features
- **Sales Analytics**: Visualisasi tren penjualan bulanan menggunakan ApexCharts.
- **Metric Insights**: Kartu metrik real-time untuk Produk, Penjualan Hari Ini, Stok, dan Low Stock Alerts.
- **Transaction Monitoring**: Tabel transaksi terbaru dengan status badges.
- **Critical Alerts**: Sistem peringatan dini untuk stok di bawah reorder point.

## Sales & POS Module (Smart POS)
- **Split-Screen Interface**: Layout khusus Terminal Kasir dengan katalog produk di kiri dan kontrol keranjang di kanan.
- **Offline-First Synchronization**: Kapasitas menyimpan transaksi di lokal (IndexedDB) dan sinkronisasi ke server (menyelesaikan PRD `POS-03`). Flag `isOffline` mencegah bentrok data.
- **Persistent Hydrated Cart**: State keranjang POS dilindungi dengan `localStorage` sinkron (Mencegah produk hilang dari keranjang ketika kasir berpindah halaman/refresh).
- **Dynamic Filtering**: Filter produk berdasarkan kategori dan pencarian real-time (Nama/SKU).
- **Transaction History**: Pencatatan riwayat lengkap dengan filter dan status (`completed`, `voided`, `synced`).
- **Role-Based Access**: Dioptimalkan untuk role `Owner` dan `Kasir` untuk membatasi fitur-fitur kritikal.

## Inventory & Distribution Module
- **Data Table Layout (Professional Design)**: Perubahan *list-view* kardus menjadi Data Table modern dengan pemisahan *Product Info*, *Pricing*, dan visualisasi hirarki Stok.
- **Tracking & Allocation**: Pemisahan visual indikator `actualQuantity` (Stok Fisik) dan `reservedQuantity` (Stok yang dialokasikan) secara *real-time*. Action "Adjust" tertata di dalam *Expandable Auto-row* sehingga tidak menutup visibilitas layar utama (melampaui UX Modal).
- **Stock Mutations Audit Trail**: Setiap perubahan stok wajib dicatat ke `StockMutation` untuk akuntabilitas.
- **Transfer Request Workflow (Pusat <-> Cabang)**: Mengakomodasi `TransferRequest` multi-step lifecycle (`pending` -> `approved` -> `shipped` -> `received`).
- **Stock Threshold Monitoring**: Indikator *badges* status otomasi ("Safe" vs "Low Stock") berdasar parameter `reorderPoint`.
- **Toggle Active/Inactive**: Kontrol visibilitas master data untuk seasonality.

## Testing & Verification
- **Akses Browser**: Verifikasi folder `/signin` mengembalikan halaman login.
- **Health Check**: Endpoint `GET /api/health` dikonfirmasi berjalan.
