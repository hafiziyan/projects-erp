"use client";

import React, { FormEvent, useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  categoryId: string | null;
};

type Category = {
  id: string;
  name: string;
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

export default function SalesPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate cart and merchant from local storage on mount
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

  // Sync cart to local storage on changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
          discountAmount: Number(discountAmount),
          items: cart.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
        },
        true
      );

      setCart([]);
      setPaymentMethod("cash");
      setDiscountAmount("0");
      setSuccessMessage("Transaksi Penjualan Berhasil!");
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Gagal membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === "all" || String(item.categoryId) === selectedCategory;
      return matchSearch && matchCategory && item.status === "active";
    });
  }, [products, search, selectedCategory]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - Number(discountAmount || 0);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Smart POS
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
          {/* Main POS Interface */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* Filters & Search */}
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

            {/* Product Scroll Area */}
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

          {/* Cart Sidebar */}
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
                       <input 
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold outline-none dark:bg-gray-800 dark:border-gray-700"
                          placeholder="Rp 0"
                       />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                     <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                     </div>
                     <div className="flex items-center justify-between text-xs font-bold text-rose-500">
                        <span>Diskon</span>
                        <span>- {formatCurrency(Number(discountAmount || 0))}</span>
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
        /* History View */
        <div className="flex-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/5 flex flex-col">
           <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/2">
               <h2 className="text-xl font-black text-gray-900 dark:text-white">Daftar Transaksi Selesai</h2>
               <div className="flex gap-2">
                   <button className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-bold text-gray-500 dark:border-gray-700">Filter Tanggal</button>
                   <button className="rounded-xl bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-brand-500/20 shadow-md">Export PDF</button>
               </div>
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/2 sticky top-0">
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
                  {sales.map((sale) => (
                    <tr key={sale.saleId} className="group hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      <td className="px-6 py-4 text-sm font-black text-brand-600 dark:text-brand-400">
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
                        <span className={`inline-flex px-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
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
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                 <div className="py-20 text-center text-gray-300">Belum ada riwayat transaksi.</div>
              )}
           </div>
        </div>
      )}

      {/* Success Notification Tooltip/Toast */}
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