# Panduan Penggunaan Setelah Update ERP Inventory & Sales

Dokumen ini menjelaskan cara menjalankan project dan memakai fitur baru setelah pull branch terbaru.

## 1. Setelah Pull Branch

Jalankan install dependency pada folder frontend agar package baru seperti `canvg` untuk fitur export PDF tersedia.

```bash
cd frontend
npm install
```

Jika menjalankan dari root project, pastikan juga dependency root sudah sinkron:

```bash
npm install
```

> Catatan: Error `Module not found: Can't resolve 'canvg'` biasanya terjadi karena dependency frontend belum di-install ulang setelah update.

## 2. Menjalankan Aplikasi

Buka dua terminal terpisah.

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

Frontend normalnya berjalan di:

```text
http://localhost:3000
```

Jika port 3000 sedang dipakai, Next.js bisa memakai port 3001. Jika muncul pesan ada server Next.js yang masih berjalan, hentikan proses lama:

```bash
taskkill /PID <PID_DARI_TERMINAL> /F
```

Contoh:

```bash
taskkill /PID 13248 /F
```

## 3. Fitur Baru: Validasi Adjust Stock

Lokasi menu:

```text
Admin Dashboard > Stocks / Inventory > Adjust
```

Perubahan:

- Quantity adjust sekarang hanya menerima angka positif.
- Angka `0` tidak bisa digunakan.
- Angka minus tidak bisa digunakan.
- Jika tetap submit quantity kosong atau tidak valid, sistem akan menolak proses adjust.

Cara pakai:

1. Buka halaman stok.
2. Pilih produk yang ingin di-adjust.
3. Klik tombol `Adjust`.
4. Pilih tipe adjustment:
   - `Add` untuk menambah stok.
   - `Subtract` untuk mengurangi stok.
   - `Set` untuk mengatur stok ke nilai tertentu.
5. Isi quantity minimal `1`.
6. Isi note jika diperlukan.
7. Klik `Confirm`.

## 4. Fitur Baru: Pembatasan Buat Merchant

Perubahan akses:

- Hanya user dengan role `Owner` yang bisa membuat merchant/cabang baru.
- Role `Kasir` dan `Gudang` tidak akan melihat tombol buat merchant baru.
- Backend juga sudah membatasi request create merchant dari non-Owner.

Cara cek:

1. Login sebagai `Owner`.
2. Buka halaman merchant.
3. Tombol `Tambah Cabang Baru` akan muncul.
4. Login sebagai `Kasir` atau `Gudang`.
5. Tombol tersebut tidak akan muncul.

## 5. Fitur Baru: Search Produk Berdasarkan SKU di Sales

Lokasi menu:

```text
Admin Dashboard > Sales / POS
```

Perubahan:

- Search produk sekarang bisa menggunakan nama produk.
- Search produk juga bisa menggunakan SKU produk.
- SKU ditampilkan di kartu produk dan item dalam keranjang.

Cara pakai:

1. Buka halaman Sales/POS.
2. Pada kolom search, ketik nama produk atau SKU.
3. Produk yang cocok akan muncul di daftar produk.
4. Klik produk untuk memasukkannya ke kotak pesanan.

Contoh:

```text
Search: KOPI
Search: SKU-001
```

## 6. Fitur Baru: Input Uang Diterima dan Kembalian

Lokasi:

```text
Admin Dashboard > Sales / POS > Kotak Pesanan
```

Perubahan:

- Ada input baru `Uang Diterima`.
- Sistem otomatis menghitung `Kembalian`.
- Rumus:

```text
Kembalian = Uang Diterima - Total
```

Jika uang diterima lebih kecil dari total, kembalian akan tampil `Rp 0`.

Cara pakai:

1. Tambahkan produk ke keranjang.
2. Atur quantity jika diperlukan.
3. Isi diskon jika ada.
4. Isi nominal pada kolom `Uang Diterima`.
5. Lihat nilai `Kembalian` di ringkasan pesanan.
6. Klik tombol proses transaksi.

Contoh:

```text
Subtotal      : Rp 50.000
Diskon        : Rp 5.000
Total         : Rp 45.000
Uang Diterima : Rp 50.000
Kembalian     : Rp 5.000
```

## 7. Troubleshooting

### Error: Module not found: Can't resolve 'canvg'

Solusi:

```bash
cd frontend
npm install
```

Lalu jalankan ulang frontend:

```bash
npm run dev
```

### Error: Another next dev server is already running

Solusi:

1. Lihat PID yang muncul di terminal.
2. Jalankan:

```bash
taskkill /PID <PID> /F
```

3. Jalankan ulang:

```bash
npm run dev
```

### Warning multiple lockfiles Next.js

Jika muncul warning seperti ini:

```text
Next.js inferred your workspace root, but it may not be correct.
Detected additional lockfiles
```

Aplikasi masih bisa berjalan. Warning ini muncul karena ada `package-lock.json` di root project dan di folder frontend.

## 8. Validasi Setelah Pull

Untuk memastikan frontend aman, jalankan:

```bash
cd frontend
npx tsc --noEmit --pretty false
```

Jika tidak ada output error, TypeScript frontend sudah valid.
