Berikut adalah **evaluasi kritis** terhadap PRD yang Anda buat, dilanjutkan dengan **PRD versi ultra lengkap** yang siap diimplementasikan oleh tim engineering, QA, dan product manager. Saya mempertahankan gaya kritis Anda dan memperdalam setiap aspek yang masih kurang.

---

## EVALUASI TERHADAP PRD SEBELUMNYA

| Aspek | Kelebihan | Kekurangan / Celah |
|-------|-----------|---------------------|
| **Latar belakang** | Relevan, masalah nyata | Tidak menyebutkan *target market segment* (mikro, kecil, menengah) yang berbeda kebutuhannya |
| **Tujuan produk** | Jelas | Tidak ada *success metrics* yang terukur (misal: "mengurangi stock opname error dari 15% ke <3%") |
| **Analisis konseptual** | Baik mengkritisi asumsi linear | Tidak membahas *inventory valuation method* (FIFO, Average, FEFO) yang penting untuk UMKM makanan/minuman |
| **Actor / Role** | Lengkap | Tidak ada role *Auditor* (untuk laporan keuangan) dan *Warehouse Staff* (jika pusat punya gudang sendiri) |
| **Use case** | Cukup | Tidak ada *reverse flow* (retur dari cabang ke pusat karena barang rusak/expired) |
| **Entitas data** | Minimalis | Tidak ada atribut, tipe data, relasi, constraint (unique, foreign key, check) |
| **Fitur inti** | Deskriptif | Kurang detail pada *edge cases* (misal: request barang tapi stok pusat kurang, bagaimana partial approval?) |
| **Kontra-argumen** | Jujur mengakui risiko over-engineering | Solusi "modular" tidak dijabarkan secara teknis (bagaimana modul diaktifkan?) |
| **Uji logika** | Menyentuh double stock & offline | Tidak membahas *race condition* pada saat stok update bersamaan dari POS dan transfer barang |
| **Alternatif pendekatan** | Ada 3 level | Tidak ada *cost-benefit analysis* antar pendekatan |
| **KPI** | Terlalu umum | Tidak ada baseline dan target spesifik per fase |
| **Non-functional** | Cukup | Tidak ada angka konkret untuk scalability (ratusan cabang = berapa transaksi/detik?), tidak ada RTO/RPO |
| **Roadmap** | Fase besar | Tidak ada milestone, tidak ada dependency antar fase |

---

# PRD ULTRA LENGKAP – SISTEM POS MULTI-CABANG UNTUK UMKM

**Versi:** 1.0  
**Tanggal:** 15 April 2026  
**Status:** Draft Final  
**Product Manager:** [Nama]  
**Target rilis MVP:** 12 minggu  

---

## 1. DOKUMEN KONTROL

| Revisi | Tanggal | Perubahan | Author |
|--------|---------|-----------|--------|
| 0.1 | 01-04-2026 | Initial draft | PM |
| 0.2 | 10-04-2026 | Menambah detail teknis & edge cases | Tech Lead |
| 1.0 | 15-04-2026 | Final review, siap produksi | PM & QA |

---

## 2. RINGKASAN EKSEKUTIF

Sistem ini adalah **POS berbasis cloud dengan manajemen inventori multi-cabang** yang dapat beroperasi secara **offline-first**. Target utama adalah UMKM *kecil dan menengah* (10-200 cabang) dengan opsi modular: POS saja, POS+inventori, atau full ERP distribusi.

**Nilai unik:**  
- *Auto-replenishment* berdasarkan safety stock (bukan manual request wajib)  
- *Reserved stock* untuk mencegah double allocation  
- *Offline sync dengan conflict resolution* berbasis timestamp + prioritas role  

**Keunggulan kompetitif:** Lebih sederhana dari ERP (Odoo/Accurate) tapi lebih kuat dari POS standar (Moka/QRIS).

---

## 3. PROBLEM STATEMENT & VALIDASI

### 3.1 Target Segmen

| Segmen | Jumlah cabang | Kebutuhan utama | Solusi minimal |
|--------|---------------|----------------|----------------|
| Mikro | 1-3 | POS, laporan sederhana | Tanpa distribusi |
| Kecil | 4-20 | Stok terpusat, request manual | Modul inventory + transfer |
| Menengah | 21-200 | Auto replenishment, forecasting | Full system |

### 3.2 Masalah Terkuantifikasi (data asumsi, perlu diuji)

- 78% UMKM multi-cabang mengaku stok tidak akurat antara pusat dan cabang (sumber: survei internal asumsi)  
- Rata-rata waktu distribusi manual: 3 hari tanpa visibilitas  
- Kerugian akibat *shrinkage* (hilang, kadaluarsa) mencapai 5-12% dari omset  

### 3.3 Hipotesis yang Akan Diuji di MVP

> "Dengan sistem request & transfer barang yang terstruktur, waktu penyelesaian permintaan cabang berkurang dari rata-rata 2 hari menjadi <4 jam (dari request hingga barang dikirim)."

**Metrik validasi:**  
- Median lead time request-to-ship di 10 cabang beta  
- Tingkat adopsi fitur request: >60% cabang aktif mengirim request per minggu

---

## 4. RUANG LINGKUP PRODUK (MoSCoW)

| Prioritas | Fitur | Deskripsi |
|-----------|-------|------------|
| **Must have** | POS offline-first | Transaksi tanpa internet, sync saat online |
| **Must have** | Multi cabang dengan role | Owner, kasir cabang, manager cabang |
| **Must have** | Stok per cabang real-time | Minimal stok, reserved stock, actual stock |
| **Must have** | Transfer order (pusat→cabang) | Workflow request→approve→ship→receive |
| **Should have** | Auto replenishment | Berdasarkan min stock & forecast sederhana |
| **Should have** | Dashboard analitik | Penjualan per cabang, stock turnover |
| **Could have** | Retur barang (cabang→pusat) | Barang rusak/expired |
| **Could have** | Integrasi akuntansi (export Jurnal) | CSV/API ke Accurate, Jurnal.id |
| **Won't have (v1)** | AI forecasting | Ditunda ke v2 |
| **Won't have (v1)** | Mobile app native | PWA cukup |

---

## 5. PERSONA PENGGUNA (DETAIL)

### 5.1 Bu Ani (Owner)
- Usaha: 15 cabang toko kelontong  
- Kemampuan teknologi: rendah (pakai WA untuk order)  
- Tujuan: Lihat omzet semua cabang dalam satu layar, tahu cabang mana yang stoknya menipis  
- Frustasi: Laporan dari kasir sering telat, stok gula kadang kosong 2 hari  

### 5.2 Mas Joko (Manager Cabang)
- Mengelola 1 cabang, lapor ke owner  
- Tujuan: Request barang cepat, stok akurat, bisa lihat profit cabang  
- Frustasi: Proses request harus telepon pusat, sering salah jumlah  

### 5.3 Siti (Kasir)
- Hanya input transaksi dan cetak struk  
- Tidak perlu lihat laporan, tidak perlu request barang  
- Frustasi: POS lemot, struk habis  

### 5.4 Pak Budi (Admin Pusat)
- Mengelola gudang pusat, menyetujui request  
- Tujuan: Stok pusat selalu cukup, pengiriman tepat waktu  
- Frustasi: Request cabang tidak sesuai kebutuhan (kadang kelebihan, kadang kurang)

---

## 6. USER STORIES (DIGUNAKAN UNTUK ACCEPTANCE CRITERIA)

| ID | Sebagai... | Saya ingin... | Sehingga... | Prioritas |
|----|------------|----------------|-------------|------------|
| US-01 | Kasir | Input transaksi saat offline | Bisnis tetap berjalan walau internet mati | Must |
| US-02 | Kasir | Stok berkurang otomatis setelah transaksi | Saya tidak perlu update manual | Must |
| US-03 | Manager cabang | Membuat request barang ke pusat dengan jumlah dan tanggal diperlukan | Stok tidak habis | Must |
| US-04 | Admin pusat | Menyetujui atau menolak request, dan jika stok pusat kurang, bisa mengirim sebagian (partial) | Efisiensi distribusi | Must |
| US-05 | Admin pusat | Melihat daftar request yang sudah dikirim tapi belum dikonfirmasi cabang | Mengetahui barang sampai atau tidak | Should |
| US-06 | Owner | Membatasi role cabang hanya bisa lihat produk tertentu | Keamanan data harga | Could |
| US-07 | Kasir | Membatalkan transaksi dan mengembalikan stok | Koreksi kesalahan | Must |

---

## 7. FUNCTIONAL REQUIREMENTS (DETAIL + ACCEPTANCE CRITERIA)

### 7.1 Manajemen Cabang

| ID | Requirement | Acceptance Criteria |
|----|-------------|----------------------|
| BR-01 | Owner dapat menambah cabang dengan nama, alamat, nomor telepon, dan kode unik | Form validasi: kode unik tidak boleh duplikat. Setelah simpan, cabang muncul di daftar. |
| BR-02 | Owner dapat menonaktifkan cabang (soft delete) | Cabang nonaktif tidak muncul di dropdown POS, tetapi data histori tetap ada. |
| BR-03 | Setiap cabang memiliki pengaturan sendiri (waktu operasional, pajak, diskon default) | Pengaturan tersimpan per cabang, tidak mempengaruhi cabang lain. |

### 7.2 POS & Transaksi

| ID | Requirement | Acceptance Criteria |
|----|-------------|----------------------|
| POS-01 | Kasir dapat menambahkan produk ke keranjang dengan scan barcode atau pilih dari daftar | Scan barcode: jika produk tidak ditemukan, muncul notifikasi "Produk tidak terdaftar". |
| POS-02 | Stok produk berkurang secara real-time setelah transaksi selesai | Jika stok tidak mencukupi (actual stock - reserved stock < quantity), transaksi ditolak. |
| POS-03 | Transaksi dapat dilakukan secara offline, disimpan di IndexedDB, dan di-sync saat online | Saat sync, jika terjadi konflik (stok sudah berubah di server), gunakan aturan: transaksi offline tetap berlaku, server mengurangi stok dengan selisih. Jika stok server negatif, transaksi ditandai sebagai "konflik" dan perlu konfirmasi owner. |
| POS-04 | Kasir dapat membatalkan transaksi | Stok yang sudah terpakai dikembalikan. Log pembatalan tercatat. |

### 7.3 Inventory & Stok

| ID | Requirement | Acceptance Criteria |
|----|-------------|----------------------|
| INV-01 | Setiap produk memiliki 3 nilai stok per cabang: `actual_quantity`, `reserved_quantity`, `available_quantity = actual - reserved` | Reserved digunakan saat request disetujui namun barang belum diterima cabang. |
| INV-02 | Sistem mencatat setiap mutasi stok (transaksi, transfer, opname, adjustment) dengan timestamp, user, dan alasan | Tabel `stock_mutation_log` wajib. Tidak boleh ada perubahan stok tanpa log. |
| INV-03 | Owner dapat melakukan stock opname per cabang dengan mekanisme: freeze stok sementara, hitung fisik, input selisih, approve adjustment | Saat freeze, transaksi tetap berjalan tapi stok tidak berubah (menggunakan nilai frozen). Setelah adjustment, selisih dicatat sebagai "adjustment". |
| INV-04 | Peringatan stok minimum: jika `available_quantity` <= `min_stock`, muncul notifikasi di dashboard cabang dan owner | Notifikasi bisa berupa badge merah. Pengaturan min_stock per produk per cabang. |

### 7.4 Request & Transfer Barang (Distribusi)

| ID | Requirement | Acceptance Criteria |
|----|-------------|----------------------|
| TR-01 | Manager cabang membuat request dengan daftar produk, jumlah, dan tanggal target | Status awal: `pending`. Sistem otomatis mengecek stok pusat? Tidak, hanya mencatat. |
| TR-02 | Admin pusat melihat daftar request, dapat approve (full/partial) atau reject dengan alasan | Jika partial, admin menentukan jumlah yang dikirim. Status berubah jadi `approved` atau `rejected`. |
| TR-03 | Saat approve, sistem otomatis mengurangi `actual_quantity` pusat dan menambah `reserved_quantity` cabang. | Pusat: actual berkurang. Cabang: reserved bertambah (actual belum berubah). |
| TR-04 | Admin pusat membuat shipment dari request yang sudah approved. Shipment memiliki nomor resi internal. | Status request berubah menjadi `shipped`. Stok pusat sudah berkurang (dari step TR-03), tidak perlu dikurangi lagi. |
| TR-05 | Cabang menerima shipment, input jumlah yang diterima (bisa berbeda dari yang dikirim jika rusak/ hilang). | Jika jumlah diterima = jumlah dikirim: reserved cabang dipindah ke actual, status `received`. Jika kurang: reserved berkurang sesuai diterima, actual bertambah, selisih dicatat sebagai `loss` dan notifikasi ke owner. |
| TR-06 | Retur barang dari cabang ke pusat (barang expired/rusak) | Cabang membuat return request, pusat approve, stok cabang berkurang actual, stok pusat bertambah (jika masih layak) atau masuk ke `waste` jika tidak. |

### 7.5 Dashboard & Analitik

| ID | Requirement | Acceptance Criteria |
|----|-------------|----------------------|
| DASH-01 | Owner melihat ringkasan: total penjualan hari ini (semua cabang), cabang dengan penjualan tertinggi, 5 produk terlaris | Data real-time dengan refresh setiap 5 menit (bukan real-time streaming untuk MVP). |
| DASH-02 | Per cabang: grafik penjualan 7 hari terakhir, rasio stok turnover (penjualan / rata-rata stok) | Perhitungan turnover menggunakan formula: `total_terjual / ((stok_awal + stok_akhir)/2)` per periode. |
| DASH-03 | Laporan stock movement: export CSV per cabang untuk keperluan akuntansi | Kolom: tanggal, produk, SKU, mutasi masuk, mutasi keluar, stok akhir, sumber (transfer/penjualan/opname). |

---

## 8. NON-FUNCTIONAL REQUIREMENTS (DETAIL & TERUKUR)

| Kategori | Requirement | Target | Metode Pengujian |
|----------|-------------|--------|-------------------|
| **Performance** | API response time (p95) untuk transaksi POS | < 500 ms | Load test 50 concurency, k6/locust |
| | Sinkronisasi offline data 100 transaksi | < 3 detik | Simulasi network throttling 3G |
| **Scalability** | Mendukung hingga 200 cabang, masing-masing 50 transaksi/jam puncak | Throughput ~10.000 transaksi/jam | Uji dengan database replika read, scaling horizontal API |
| **Availability** | Uptime POS mode online | 99.5% (boleh maintenance 3 jam/bulan) | Monitoring UptimeRobot + alerting |
| **Reliability** | Data tidak hilang dalam kondisi crash (durability) | RPO = 5 menit, RTO = 1 jam | Simulasi failover database, restore backup |
| **Security** | Autentikasi JWT dengan refresh token, expiry access token 1 jam | Tidak ada akses antar cabang tanpa role | Penetration test sederhana (OWASP top 10) |
| **Concurrency** | Dua kasir di cabang yang sama transaksi bersamaan produk terakhir stok 1 | Hanya satu yang berhasil, yang lain gagal dengan error "stok habis" | Uji race condition dengan JMeter |
| **Offline capability** | POS dapat melakukan transaksi hingga 500 baris tanpa koneksi | Data tetap tersimpan dan bisa sync | Putuskan kabel internet, transaksi, sambungkan lagi |

---

## 9. DATA MODEL & ENTITY RELATIONSHIP DIAGRAM (ERD)

Berikut adalah **atribut minimal** untuk setiap entitas (tipe data PostgreSQL).

### 9.1 `branches`
| Kolom | Tipe | Constraint |
|-------|------|------------|
| id | UUID | PK |
| owner_id | UUID | FK ke users |
| code | VARCHAR(10) | UNIQUE |
| name | VARCHAR(100) | NOT NULL |
| address | TEXT | |
| phone | VARCHAR(20) | |
| is_active | BOOLEAN | DEFAULT true |
| settings | JSONB | (pajak, timezone, dll) |
| created_at | TIMESTAMP | |

### 9.2 `products`
| Kolom | Tipe |
|-------|------|
| id | UUID PK |
| sku | VARCHAR(50) UNIQUE |
| name | VARCHAR(200) |
| category_id | UUID FK |
| unit | VARCHAR(20) |
| default_price | DECIMAL(12,2) |
| is_active | BOOLEAN |

### 9.3 `branch_products` (harga & stok per cabang)
| Kolom | Tipe |
|-------|------|
| branch_id | UUID FK |
| product_id | UUID FK |
| selling_price | DECIMAL(12,2) |
| actual_quantity | DECIMAL(10,2) |
| reserved_quantity | DECIMAL(10,2) |
| min_stock | DECIMAL(10,2) |
| PRIMARY KEY (branch_id, product_id) |

### 9.4 `stock_mutations`
| Kolom | Tipe |
|-------|------|
| id | BIGSERIAL PK |
| branch_id | UUID FK |
| product_id | UUID FK |
| mutation_type | ENUM ('sale', 'sale_cancel', 'transfer_out', 'transfer_in', 'adjustment', 'return') |
| quantity_change | DECIMAL (bisa positif/negatif) |
| reference_id | UUID (ID transaksi/transfer/request) |
| created_by | UUID FK users |
| created_at | TIMESTAMP |

### 9.5 `transfer_requests`
| Kolom | Tipe |
|-------|------|
| id | UUID PK |
| from_branch_id | UUID FK (pusat) |
| to_branch_id | UUID FK (cabang) |
| status | ENUM ('pending','approved','rejected','shipped','received','partial_received') |
| requested_by | UUID FK |
| approved_by | UUID FK nullable |
| notes | TEXT |

### 9.6 `transfer_items`
| Kolom | Tipe |
|-------|------|
| request_id | UUID FK |
| product_id | UUID FK |
| quantity_requested | DECIMAL |
| quantity_approved | DECIMAL |
| quantity_shipped | DECIMAL |
| quantity_received | DECIMAL |

### 9.7 `transactions` (header)
| Kolom | Tipe |
|-------|------|
| id | UUID PK |
| branch_id | UUID FK |
| cashier_id | UUID FK |
| transaction_date | TIMESTAMP |
| total_amount | DECIMAL |
| payment_method | ENUM ('cash','qris','transfer') |
| status | ENUM ('completed','voided','synced') |
| is_offline | BOOLEAN |

### 9.8 `transaction_items`
| Kolom | Tipe |
|-------|------|
| transaction_id | UUID FK |
| product_id | UUID FK |
| quantity | DECIMAL |
| price_at_sale | DECIMAL |

**Relasi kunci:**  
- `branch_products` adalah tabel *junction* dengan stok aktual+reserved.  
- `stock_mutations` adalah *source of truth* untuk semua perubahan stok.  
- Transfer request menggunakan reserved stock untuk mencegah double allocation.

---

## 10. API DESIGN (RESTful) – CONTOH ENDPOINT KRITIS

**Base URL:** `https://api.posku.co.id/v1`  
**Auth:** Bearer JWT

### 10.1 POS Transaction (offline-aware)

```http
POST /transactions
Request Body (online):
{
  "branch_id": "uuid",
  "items": [{"product_id": "uuid", "quantity": 2}],
  "payment_method": "cash",
  "total_amount": 50000
}
Response 201:
{
  "transaction_id": "uuid",
  "status": "completed",
  "stock_updates": [...] 
}

Offline mode: Client menyimpan transaksi di local storage, kemudian POST ke endpoint /sync/offline-transactions dengan array.
```

### 10.2 Transfer Request

```http
POST /transfer-requests
Request:
{
  "from_branch_id": "pusat",
  "to_branch_id": "cabang",
  "items": [{"product_id": "p1", "quantity_requested": 100}]
}
Response: 201 dengan status pending.

PATCH /transfer-requests/{id}/approve
Body: {"items": [{"product_id": "p1", "quantity_approved": 80}]}  // partial
```

### 10.3 Stock Inquiry (dengan reserved)

```http
GET /branches/{branch_id}/products/{product_id}/stock
Response:
{
  "actual": 150,
  "reserved": 20,
  "available": 130,
  "min_stock": 50
}
```

---

## 11. EDGE CASES & ERROR HANDLING

| Skenario | Penanganan |
|----------|-------------|
| **Cabang request 100 unit, pusat hanya punya 30** | Admin bisa approve partial 30, sisanya ditolak atau menunggu restok. Tidak otomatis membatalkan semua. |
| **Barang sudah di-ship dari pusat, tapi cabang tutup permanen** | Admin pusat dapat membatalkan shipment (jika status masih shipped), stok pusat dikembalikan. |
| **Dua transaksi offline dari cabang yang sama, sync bersamaan dengan stok yang sama** | Gunakan *optimistic locking*: setiap transaksi memiliki `version` pada stok. Yang lebih dulu sukses, yang kedua gagal dengan kode 409 Conflict. User diarahkan untuk melakukan stock opname kecil. |
| **Kasir lupa logout, perangkat hilang** | Admin cabang dapat *revoke* semua token user yang hilang. |
| **Stok negatif terjadi karena bug** | Sistem otomatis membuat *adjustment* dengan log "automatic correction" dan mengirim notifikasi ke owner. |
| **Produk dihapus padahal ada stok di cabang** | Soft delete: produk status inactive, stok tetap ada tapi tidak bisa dijual. Admin harus transfer stok ke produk lain atau write-off. |

---

## 12. SECURITY & COMPLIANCE

- **RBAC (Role Based Access Control):** Tabel `roles_permissions` menyimpan akses per endpoint. Contoh: kasir tidak boleh akses `/transfer-requests`.
- **Data encryption:** Semua PII (nama pelanggan jika disimpan) dienkripsi dengan AES-256. Backup juga dienkripsi.
- **Pajak:** Setiap transaksi wajib menyimpan rincian pajak (PPN 11% atau non-PPN) sesuai pengaturan cabang. Laporan pajak bulanan bisa diekspor.
- **GDPR / PDP Indonesia:** User dapat minta hapus datanya, semua data transaksi tetap disimpan (karena wajib pajak) tapi data pribadi di-anonymize.

---

## 13. INTEGRASI EKSTERNAL (UNTUK PHASE 2)

| Sistem | Tujuan | Metode |
|--------|--------|--------|
| Akuntansi (Jurnal.id, Accurate) | Export jurnal penjualan, pembelian, adjustment | CSV bulanan atau REST API |
| E-commerce (Tokopedia, Shopee) | Sinkron stok pusat ke toko online | Webhook + scheduler tiap 15 menit |
| Expedisi (JNE, SiCepat) | Cetak label otomatis untuk transfer barang | API integration (bisa ditunda) |

---

## 14. DEPLOYMENT ARCHITECTURE (MVP)

```
[Client Web (PWA)] → Cloudflare CDN → [Load Balancer (HAProxy)] 
                                      ↓
                          [API Server Node.js (3 replicas)]
                                      ↓
                          [PostgreSQL (Primary + Read Replica)]
                          [Redis (untuk session & rate limiting)]
                          [MinIO / S3 (untuk upload struk PDF)]
```

**Biaya estimasi untuk 100 cabang aktif:**  
- API server: ~$150/bulan (3 t3.micro)  
- Database: ~$100/bulan (db.t3.micro + replica)  
- Storage: ~$20/bulan  
- **Total ~$270/bulan** – bisa ditanggung 100 cabang dengan harga langganan $10/bulan per cabang.

---

## 15. RELEASE CRITERIA (DEFINITION OF DONE)

Setiap rilis MVP harus memenuhi:

1. Semua *Must have* user stories memiliki acceptance criteria yang terotomatisasi (minimal 80% coverage unit test + E2E test untuk POS flow).
2. Load test: 50 concurrent transaksi per detik, p95 response < 500ms.
3. Security scan: tidak ada critical vulnerability (SQL injection, XSS, broken auth).
4. Offline mode diuji di 3 perangkat berbeda (Chrome, Safari, Firefox) dengan jaringan mati 30 menit.
5. Dokumentasi API lengkap (Swagger/OpenAPI) dan panduan user (video singkat untuk kasir).

---

## 16. ROADMAP DENGAN MILESTONE (12 MINGGU)

| Minggu | Aktivitas | Deliverable |
|--------|-----------|--------------|
| 1-2 | Persiapan: arsitektur, setup CI/CD, database schema | ERD final, repo skeleton |
| 3-5 | Backend: auth, branch, product, stok dasar, POS API | API siap diuji, unit test pass |
| 6-7 | Frontend: POS (offline-first dengan IndexedDB), dashboard sederhana | Kasir bisa transaksi offline |
| 8-9 | Fitur distribusi: request, approve, transfer, receive | End-to-end request barang dari cabang sampai stok bertambah |
| 10-11 | Integrasi & testing: load test, security, beta dengan 5 UMKM real | Bug fix, UAT sign-off |
| 12 | Deployment produksi, monitoring, dokumentasi | Live dengan 10 cabang pilot |

---

## 17. RISK ASSESSMENT & MITIGASI

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|--------------|--------|-----------|
| UMKM tidak mau menggunakan karena terlalu rumit | Tinggi | Tinggi | Buat mode *simplified* (hanya POS + stok cabang). Fitur distribusi disembunyikan di menu advanced. |
| Offline sync conflict sering terjadi | Sedang | Sedang | Beri notifikasi ke owner dan rekomendasi stock opname. Di versi lanjut, tambahkan *merge tool* manual. |
| Performa database menurun saat 200 cabang | Rendah | Tinggi | Gunakan partitioning tabel `stock_mutations` per bulan, index yang tepat, dan read replica untuk laporan. |
| Kasir nakal (menghapus transaksi tanpa sepengetahuan) | Sedang | Tinggi | Setiap void/cancel wajib alasan dan butuh approval manager (bisa diatur per cabang). Audit log tidak bisa dihapus. |

---

## 18. METRIK KEBERHASILAN PRODUK (POST-MVP)

| Metrik | Target (3 bulan setelah rilis) | Cara Ukur |
|--------|-------------------------------|------------|
| Akurasi stok (selisih fisik vs sistem) | < 2% | Bandingkan hasil stock opname rutin |
| Waktu distribusi (median request → sampai) | < 6 jam | Dari log transfer request |
| DAU (daily active users) / total user | > 40% | Metrik produk |
| CSAT (survey kepuasan) | > 4.5/5 | Survey in-app setiap 2 minggu |
| Churn rate (berhenti langganan) | < 5% per bulan | Metrik bisnis |

---

## 19. KESIMPULAN & REKOMENDASI FINAL

PRD ini sudah **ultra lengkap** dan siap digunakan sebagai *single source of truth* untuk tim engineering, QA, dan product. Perbaikan utama dari versi sebelumnya:

- ✅ Menambahkan **metrik terukur** untuk setiap requirement
- ✅ Menyediakan **data model dengan atribut spesifik** (bukan sekadar nama entitas)
- ✅ Menangani **edge cases** (partial fulfillment, double allocation, offline conflict)
- ✅ Memberikan **acceptance criteria** yang bisa langsung dijadikan test case
- ✅ Menyertakan **estimasi biaya dan arsitektur** untuk diskusi dengan stakeholder
- ✅ Memisahkan **modular feature** secara eksplisit (bukan sekadar konsep)

**Langkah selanjutnya yang Anda minta:**  
Saya siap membuat **ERD visual** (dalam format Mermaid atau SQL DDL lengkap), **API OpenAPI specification**, atau **UI/UX wireframe** untuk halaman kritis (POS, request barang, dashboard owner). Cukup sebutkan arah yang Anda inginkan.