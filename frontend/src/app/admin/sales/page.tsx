"use client";

import React, { FormEvent, useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Category = {
  id: string;
  name: string;
};

// --- PERBAIKAN: Menyesuaikan struktur data dari backend ---
type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  category: Category | null; // Sebelumnya categoryId: string | null
};

type Sale = {
  saleId: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  totalItems: number;
  cashier: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
};

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
};

type SaleItemDetail = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

// --- FUNGSI HELPER UNTUK FORMAT RUPIAH ---
function formatRupiah(value: string) {
  const numericValue = value.replace(/\D/g, "");
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
}

export default function SalesPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [saleDetails, setSaleDetails] = useState<SaleItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- STATE UNTUK FILTER TANGGAL ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    try {
      const active = getActiveMerchant();
      setMerchant(active);

      const savedCart = localStorage.getItem("pos_cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("Gagal melakukan load data dari storage", e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState(""); 
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isExporting, setIsExporting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productRes, salesRes, categoryRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>("/master/products?status=active", true),
        api.get<{ success: boolean; data: Sale[] }>("/sales", true),
        api.get<{ success: boolean; data: Category[] }>("/master/categories", true),
      ]);

      setProducts(productRes.data || []);
      setSales(salesRes.data || []);
      setCategories(categoryRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data penjualan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadSaleDetail(saleId: string) {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      return;
    }

    try {
      setExpandedSaleId(saleId);
      setDetailLoading(true);
      const res = await api.get<any>(`/sales/${saleId}`, true);
      
      const rawData = res.data;
      let extractedItems: SaleItemDetail[] = [];

      if (Array.isArray(rawData)) {
        extractedItems = rawData;
      } else if (rawData && Array.isArray(rawData.items)) {
        extractedItems = rawData.items.map((item: any) => ({
          id: item.id || Math.random().toString(),
          productId: item.productId || item.product?.id || "",
          productName: item.productName || item.product?.name || "Unknown Product",
          quantity: Number(item.quantity || 0),
          price: Number(item.price || item.unitPrice || 0),
          subtotal: Number(item.subtotal || (item.quantity * (item.price || item.unitPrice)) || 0)
        }));
      }

      setSaleDetails(extractedItems);
    } catch (err: any) {
      console.error("Gagal memuat detail penjualan", err);
      setSaleDetails([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function updateQty(productId: string, type: "plus" | "minus") {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;

          if (type === "plus" && item.quantity < item.stock) {
            return { ...item, quantity: item.quantity + 1 };
          }

          if (type === "minus") {
            return { ...item, quantity: item.quantity - 1 };
          }

          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  const numericDiscount = Number(discountAmount.replace(/\D/g, "") || 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - numericDiscount;

  async function handleCreateSale(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/sales",
        {
          paymentMethod,
          discountAmount: numericDiscount,
          items: cart.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
        },
        true
      );

      setCart([]);
      setPaymentMethod("cash");
      setDiscountAmount(""); 
      setSuccessMessage("Transaksi Penjualan Berhasil!");
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Gagal membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (!startDate && !endDate) return true;
      
      const saleDate = new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0); 

      let isAfterStart = true;
      let isBeforeEnd = true;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        isAfterStart = saleDate >= start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        isBeforeEnd = saleDate <= end;
      }

      return isAfterStart && isBeforeEnd;
    });
  }, [sales, startDate, endDate]);

  async function exportToPDF() {
    try {
      setIsExporting(true); 

      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("Laporan Riwayat Penjualan", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Toko: ${merchant?.merchantName || "Antigravity ERP"}`, 14, 28);
      
      let periodText = "Semua Waktu";
      if (startDate && endDate) periodText = `${startDate} s/d ${endDate}`;
      else if (startDate) periodText = `Sejak ${startDate}`;
      else if (endDate) periodText = `Hingga ${endDate}`;
      
      doc.text(`Periode: ${periodText}`, 14, 34);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 40);

      const tableColumn = ["No. Invoice", "Kasir", "Jml Item", "Metode Bayar", "Total Akhir", "Waktu"];
      
      const tableRows = filteredSales.map((sale) => [
        sale.invoiceNumber,
        sale.cashier?.name || "System",
        sale.totalItems.toString(),
        sale.paymentMethod.toUpperCase(),
        formatCurrency(sale.totalAmount),
        new Date(sale.createdAt).toLocaleString("id-ID", { 
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })
      ]);

      if (typeof autoTable === "function") {
         autoTable(doc, {
           head: [tableColumn],
           body: tableRows,
           startY: 46,
           theme: 'grid',
           headStyles: { fillColor: [59, 130, 246] }, 
           styles: { fontSize: 8 },
         });
      } else {
         (doc as any).autoTable({
           head: [tableColumn],
           body: tableRows,
           startY: 46,
           theme: 'grid',
           headStyles: { fillColor: [59, 130, 246] }, 
           styles: { fontSize: 8 },
         });
      }

      doc.save(`Laporan_Penjualan_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat memproses PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  // --- PERBAIKAN LOGIKA FILTER PRODUK ---
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      // Mengubah pembacaan filter dari item.categoryId menjadi item.category?.id
      const matchCategory = selectedCategory === "all" || String(item.category?.id) === selectedCategory;
      return matchSearch && matchCategory && item.status === "active";
    });
  }, [products, search, selectedCategory]);
  // --------------------------------------

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Kasir Penjualan (POS)
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
             {merchant?.merchantName || "Antigravity ERP"}
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-gray-100 p-1 dark:bg-white/5">
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "pos" ? "bg-white text-brand-600 shadow-sm dark:bg-brand-500 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Terminal Kasir
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "history" ? "bg-white text-brand-600 shadow-sm dark:bg-brand-500 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Riwayat Penjualan
          </button>
        </div>
      </div>

      {activeTab === "pos" ? (
        <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-6 overflow-hidden">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition ${
                      selectedCategory === "all" ? "bg-brand-500 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-white/5"
                    }`}
                  >
                    Semua Produk
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(String(cat.id))}
                      className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition ${
                        selectedCategory === String(cat.id) ? "bg-brand-500 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-white/5"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="relative group min-w-[300px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Produk atau Scan SKU..."
                    className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-11 pr-4 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-gray-800 dark:bg-white/2 dark:focus:bg-white/10 transition"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               {loading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-3xl bg-gray-100 animate-pulse dark:bg-white/5"></div>)}
                 </div>
               ) : filteredProducts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-30">
                    <svg className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="font-bold text-xl uppercase tracking-widest">Produk Tidak Ditemukan</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                   {filteredProducts.map((item) => (
                    <button
                      key={item.id}
                      disabled={item.stock <= 0}
                      onClick={() => addToCart(item)}
                      className="group relative flex flex-col text-left rounded-3xl border border-gray-100 bg-white p-3 shadow-theme-sm transition hover:scale-[1.02] hover:shadow-xl dark:border-gray-800 dark:bg-white/5 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                      <div className="aspect-square w-full rounded-2xl bg-gray-50 overflow-hidden dark:bg-white/5 mb-4 relative">
                          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                             <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                          </div>
                          <div className="absolute top-2 right-2 rounded-lg bg-white/80 backdrop-blur px-2 py-1 text-[10px] font-black text-gray-900 border border-white/50">
                             Stok: {item.stock}
                          </div>
                      </div>
                      <h3 className="ml-1 text-sm font-black text-gray-900 line-clamp-1 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="ml-1 mt-1 text-xs font-bold text-brand-500">
                        {formatCurrency(item.price)}
                      </p>
                      
                      <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white scale-0 group-hover:scale-100 transition shadow-lg shadow-brand-500/30">
                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                         </svg>
                      </div>
                    </button>
                  ))}
                 </div>
               )}
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
            <div className="flex-1 rounded-3xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-white/5 flex flex-col overflow-hidden">
               <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/2">
                   <h2 className="text-xl font-black text-gray-900 dark:text-white">Pesanan Saat Ini</h2>
                   <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-rose-500 hover:underline">Hapus Semua</button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-20">
                       <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                       </svg>
                       <p className="font-bold text-sm tracking-widest uppercase">Keranjang Kosong</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-4 group">
                         <div className="h-14 w-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300">
                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                             </svg>
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-900 dark:text-white truncate">{item.productName}</p>
                            <p className="text-[11px] font-bold text-gray-400">{formatCurrency(item.price)}</p>
                         </div>
                         <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-2 py-1 dark:bg-white/5 border border-gray-100 dark:border-gray-800">
                             <button onClick={() => updateQty(item.productId, "minus")} className="text-gray-400 hover:text-brand-500 transition">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M20 12H4" /></svg>
                             </button>
                             <span className="text-xs font-black min-w-[15px] text-center dark:text-white">{item.quantity}</span>
                             <button onClick={() => updateQty(item.productId, "plus")} className="text-gray-400 hover:text-brand-500 transition">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                             </button>
                         </div>
                      </div>
                    ))
                  )}
               </div>

               <div className="p-6 bg-gray-50/50 dark:bg-white/2 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Metode Bayar</label>
                       <select 
                          value={paymentMethod} 
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold outline-none dark:bg-gray-800 dark:border-gray-700"
                       >
                          <option value="cash">Tunai (Cash)</option>
                          <option value="qris">Qris System</option>
                          <option value="transfer">Bank Transfer</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Diskon Total</label>
                       <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                             <span className="text-gray-500 text-xs font-semibold">Rp</span>
                          </div>
                          <input 
                             type="text"
                             value={discountAmount}
                             onChange={(e) => setDiscountAmount(formatRupiah(e.target.value))}
                             className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs font-bold outline-none dark:bg-gray-800 dark:border-gray-700"
                             placeholder="0"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                     <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                     </div>
                     <div className="flex items-center justify-between text-xs font-bold text-rose-500">
                        <span>Diskon</span>
                        <span>- {formatCurrency(numericDiscount)}</span>
                     </div>
                     <div className="flex items-center justify-between text-xl font-black text-gray-900 dark:text-white pt-2">
                        <span>TOTAL</span>
                        <span>{formatCurrency(Math.max(total, 0))}</span>
                     </div>
                  </div>

                  <button
                    onClick={handleCreateSale}
                    disabled={submitting || cart.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-sm font-black text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {submitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    ) : (
                        <>
                           Bayar & Cetak Struk
                           <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </>
                    )}
                  </button>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/5 flex flex-col">
           <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col xl:flex-row xl:items-center justify-between bg-gray-50/50 dark:bg-white/2 gap-4 relative z-50">
               <h2 className="text-xl font-black text-gray-900 dark:text-white">Daftar Transaksi Selesai</h2>
               
               <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 shadow-sm">
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 min-w-[130px] rounded-lg bg-gray-50 dark:bg-gray-800 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-brand-500 transition-all"
                        title="Dari Tanggal"
                      />
                      <span className="text-gray-400 font-bold px-1">-</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 min-w-[130px] rounded-lg bg-gray-50 dark:bg-gray-800 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-brand-500 transition-all"
                        title="Sampai Tanggal"
                      />
                      {(startDate || endDate) && (
                        <button 
                          onClick={() => { setStartDate(""); setEndDate(""); }}
                          className="h-9 px-3 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs font-bold transition-all ml-1"
                        >
                          Clear
                        </button>
                      )}
                   </div>

                   <button 
                     onClick={exportToPDF}
                     disabled={isExporting}
                     className="h-12 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white shadow-brand-500/20 shadow-md hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
                   >
                     {isExporting ? "Memproses PDF..." : "Export PDF"}
                   </button>
               </div>
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/2 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Nomor Invoice</th>
                    <th className="px-6 py-4">Nama Kasir</th>
                    <th className="px-6 py-4 text-center">Qty Item</th>
                    <th className="px-6 py-4">Metode Bayar</th>
                    <th className="px-6 py-4">Total Akhir</th>
                    <th className="px-6 py-4">Waktu Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredSales.map((sale) => (
                    <React.Fragment key={sale.saleId}>
                      <tr 
                        onClick={() => loadSaleDetail(sale.saleId)}
                        className={`group cursor-pointer transition ${expandedSaleId === sale.saleId ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-white/2'}`}
                      >
                        <td className="px-6 py-4 text-sm font-black text-brand-600 dark:text-brand-400 flex items-center gap-2">
                           <span className={`text-[10px] ${expandedSaleId === sale.saleId ? 'rotate-180' : ''} transition-transform`}>▼</span>
                           {sale.invoiceNumber}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-[10px] font-black text-brand-600 border border-brand-100">
                                {sale.cashier?.name?.charAt(0) || "U"}
                             </div>
                             <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sale.cashier?.name || "System"}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-600 dark:text-gray-400">{sale.totalItems}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                              sale.paymentMethod === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                             {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900 dark:text-white">
                           {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-gray-400">
                           {new Date(sale.createdAt).toLocaleString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>

                      {expandedSaleId === sale.saleId && (
                        <tr className="bg-gray-50/30 dark:bg-gray-900/40 border-b-2 border-brand-100 dark:border-brand-900/30">
                          <td colSpan={6} className="px-14 py-6">
                            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/50">
                              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Rincian Barang</h4>
                              {detailLoading ? (
                                <p className="py-4 text-center text-xs text-gray-400 animate-pulse">Memuat rincian...</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="border-b border-gray-100 text-gray-400 dark:border-gray-700">
                                      <tr>
                                        <th className="pb-2 font-bold uppercase">Nama Produk</th>
                                        <th className="pb-2 text-right font-bold uppercase">Harga Satuan</th>
                                        <th className="pb-2 text-center font-bold uppercase">Qty</th>
                                        <th className="pb-2 text-right font-bold uppercase">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                      {(Array.isArray(saleDetails) ? saleDetails : []).map((det) => (
                                        <tr key={det.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                                          <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{det.productName}</td>
                                          <td className="py-3 text-right text-gray-500">{formatCurrency(det.price)}</td>
                                          <td className="py-3 text-center font-bold text-gray-700 dark:text-gray-300">x{det.quantity}</td>
                                          <td className="py-3 text-right font-black text-gray-900 dark:text-white">
                                            {formatCurrency(det.subtotal)}
                                          </td>
                                        </tr>
                                      ))}
                                      {saleDetails.length === 0 && !detailLoading && (
                                        <tr>
                                          <td colSpan={4} className="py-4 text-center text-gray-400">Tidak ada rincian yang tersedia.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    {sale.discountAmount > 0 && (
                                      <tfoot className="border-t border-gray-100 dark:border-gray-700">
                                        <tr>
                                          <td colSpan={3} className="py-2 text-right font-bold text-rose-500">Total Diskon</td>
                                          <td className="py-2 text-right font-black text-rose-500">- {formatCurrency(sale.discountAmount)}</td>
                                        </tr>
                                      </tfoot>
                                    )}
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredSales.length === 0 && (
                 <div className="py-20 text-center text-gray-300">Belum ada riwayat transaksi pada rentang waktu ini.</div>
              )}
           </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl animate-bounce-short z-50 flex items-center gap-3 font-bold border-4 border-white/20 backdrop-blur-md">
           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
           {successMessage}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; }
        
        @keyframes bounce-short {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
        .animate-bounce-short { animation: bounce-short 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}