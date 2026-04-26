"use client";

import React, { FormEvent, useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";
import { useSearchParams } from "next/navigation"; 

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  reorderPoint: number; 
  status: string;
};

type Purchase = {
  purchaseId: string;
  invoiceNumber: string;
  totalAmount: number;
  totalItems: number;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
};

type PurchaseItemDetail = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  subtotal: number;
};

type PurchaseItemForm = {
  productId: string;
  quantity: string;
  cost: string;
};

type ActiveMerchant = {
  merchantId: string;
  merchantName: string | null;
  role: string | null;
} | null;

function formatRupiah(value: string) {
  const numericValue = value.replace(/\D/g, "");
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function PurchasesPage() {
  const searchParams = useSearchParams();
  const [merchant, setMerchant] = useState<ActiveMerchant>(null);
  const [mounted, setMounted] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<PurchaseItemForm[]>([
    { productId: "", quantity: "", cost: "" },
  ]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<PurchaseItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const isAutoFilled = useRef(false);

  useEffect(() => {
    setMerchant(getActiveMerchant());
    setMounted(true);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productRes, purchaseRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>("/master/products", true),
        api.get<{ success: boolean; data: Purchase[] }>("/purchases", true),
      ]);

      const fetchedProducts = productRes.data || [];
      setProducts(fetchedProducts);
      setPurchases(purchaseRes.data || []);

      if (!isAutoFilled.current) {
        const actionParam = searchParams.get("action");
        const productParam = searchParams.get("productId");

        if (actionParam === "restock_low") {
          const lowStockItems = fetchedProducts.filter((p) => p.stock <= p.reorderPoint);
          if (lowStockItems.length > 0) {
            setItems(lowStockItems.map((p) => ({ productId: p.id.toString(), quantity: "", cost: "" })));
          }
        } else if (productParam) {
          const targetProduct = fetchedProducts.find((p) => p.id.toString() === productParam);
          if (targetProduct) {
            setItems([{ productId: targetProduct.id.toString(), quantity: "", cost: "" }]);
          }
        }
        
        isAutoFilled.current = true; 
      }

    } catch (err: any) {
      setError(err.message || "Gagal memuat data purchase");
    } finally {
      setLoading(false);
    }
  }

  // --- FUNGSI LOAD DETAIL YANG SUDAH DIBUAT KEBAL ERROR ---
  async function loadPurchaseDetail(purchaseId: string) {
    if (expandedId === purchaseId) {
      setExpandedId(null);
      return;
    }

    try {
      setExpandedId(purchaseId);
      setDetailLoading(true);
      const res = await api.get<any>(
        `/purchases/${purchaseId}`,
        true
      );
      
      const rawData = res.data;
      let extractedItems: PurchaseItemDetail[] = [];

      // Cek apakah data langsung berupa array
      if (Array.isArray(rawData)) {
        extractedItems = rawData;
      } 
      // Cek apakah data dibungkus dalam object { items: [...] }
      else if (rawData && Array.isArray(rawData.items)) {
        extractedItems = rawData.items.map((item: any) => ({
          id: item.id || Math.random().toString(),
          productId: item.productId || item.product?.id || "",
          productName: item.productName || item.product?.name || "Unknown Product",
          quantity: Number(item.quantity || 0),
          cost: Number(item.cost || 0),
          subtotal: Number(item.subtotal || (item.quantity * item.cost) || 0)
        }));
      }

      setDetails(extractedItems);
    } catch (err: any) {
      console.error("Gagal memuat detail purchase", err);
      setDetails([]); // Set sebagai array kosong agar map tidak crash
    } finally {
      setDetailLoading(false);
    }
  }
  // --------------------------------------------------------

  useEffect(() => {
    loadData();
  }, [searchParams]);

  function addItemRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "", cost: "" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof PurchaseItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/purchases",
        {
          invoiceNumber: invoiceNumber || undefined,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            cost: Number(item.cost.replace(/\D/g, "")),
          })),
        },
        true
      );

      setInvoiceNumber("");
      setItems([{ productId: "", quantity: "", cost: "" }]);
      window.history.replaceState(null, '', '/admin/purchases');
      
      await loadData();
    } catch (err: any) {
      setError(err.message || "Gagal membuat purchase");
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.cost.replace(/\D/g, "") || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Purchases
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Create Purchase
            </h2>
            <button 
              type="button" 
              onClick={() => window.location.href = '?action=restock_low'}
              className="text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-600"
            >
              Auto-Restock Low
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Number
              </label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-3 shadow-sm bg-gray-50/50 dark:bg-gray-800/30 dark:border-gray-800"
                >
                  <div className="space-y-3">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                    >
                      <option value="" disabled>Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stok: {product.stock})
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        required
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="Quantity"
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                      />

                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm font-semibold">Rp</span>
                        </div>
                        <input
                          required
                          type="text"
                          value={item.cost}
                          onChange={(e) => updateItem(index, "cost", formatRupiah(e.target.value))}
                          placeholder="0"
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="w-full rounded-lg bg-red-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-500 transition-colors"
                      >
                        Remove Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 transition-colors"
            >
              + Add Another Item
            </button>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800/50 dark:border-gray-800">
              <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-lg text-brand-600 dark:text-brand-400">Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0 || items.some(i => !i.productId || !i.quantity || !i.cost)}
              className="w-full rounded-lg bg-brand-500 px-4 py-3.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60 transition-all shadow-md shadow-brand-500/20"
            >
              {submitting ? "Processing..." : "Confirm Purchase"}
            </button>
          </form>
        </div>

        {/* Purchase History Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Purchase History
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading data...</p>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
               <svg className="h-12 w-12 opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               <p className="text-sm font-medium">Belum ada data purchase.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div key={purchase.purchaseId} className="space-y-2">
                  <div
                    onClick={() => loadPurchaseDetail(purchase.purchaseId)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      expandedId === purchase.purchaseId
                        ? "border-brand-500 bg-brand-50/10 shadow-sm"
                        : "border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {purchase.invoiceNumber || "No Invoice"}
                          </h3>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${expandedId === purchase.purchaseId ? 'text-brand-500' : 'text-gray-400'}`}>
                            {expandedId === purchase.purchaseId ? "Tutup Detail" : "Lihat Detail"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          PIC: <span className="font-medium text-gray-700 dark:text-gray-300">{purchase.user?.name || "System"}</span> • Total Barang: {purchase.totalItems} Items
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          Rp {purchase.totalAmount.toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">
                          {new Date(purchase.createdAt).toLocaleString("id-ID", { dateStyle: 'medium', timeStyle: 'short'})}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Table dengan Safety Check */}
                  {expandedId === purchase.purchaseId && (
                    <div className="mx-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40 animate-fade-in-up">
                      {detailLoading ? (
                        <p className="text-center text-xs font-semibold text-gray-400 animate-pulse py-4">Memuat rincian barang...</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-gray-200 text-gray-400 dark:border-gray-700">
                              <tr>
                                <th className="pb-3 font-bold uppercase tracking-wider">Nama Produk</th>
                                <th className="pb-3 text-right font-bold uppercase tracking-wider">Qty</th>
                                <th className="pb-3 text-right font-bold uppercase tracking-wider">Harga Beli</th>
                                <th className="pb-3 text-right font-bold uppercase tracking-wider">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {(Array.isArray(details) ? details : []).map((det) => (
                                <tr key={det.id} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                  <td className="py-3 font-medium text-gray-900 dark:text-gray-200">{det.productName}</td>
                                  <td className="py-3 text-right font-bold text-gray-700 dark:text-gray-300">{det.quantity}</td>
                                  <td className="py-3 text-right text-gray-500 dark:text-gray-400">
                                    {det.cost.toLocaleString("id-ID")}
                                  </td>
                                  <td className="py-3 text-right font-black text-gray-900 dark:text-white">
                                    {det.subtotal.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              ))}
                              {details.length === 0 && !detailLoading && (
                                <tr>
                                  <td colSpan={4} className="py-4 text-center text-gray-400">Tidak ada rincian yang tersedia.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }`}</style>
    </div>
  );
}