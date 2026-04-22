"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
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
  items?: {
    id: string;
    product: { name: string };
    quantity: number;
    cost: number;
  }[];
  createdAt: string;
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

export default function PurchasesPage() {
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

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // --- FUNGSI PRINT ---
  const handlePrint = () => {
    window.print();
  };

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

      setProducts(productRes.data || []);
      setPurchases(purchaseRes.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat data Purchase";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
            cost: Number(item.cost),
          })),
        },
        true
      );

      setInvoiceNumber("");
      setItems([{ productId: "", quantity: "", cost: "" }]);
      await loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal membuat Purchase";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* CSS PRINT - Thermal Printer Style */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #purchase-receipt, #purchase-receipt * { visibility: visible; }
          #purchase-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
            color: black !important;
            font-family: monospace;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Purchases
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
        </p>
      </div>

      {error && (
        <div className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="no-print grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Form Create */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1 h-fit">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Create Purchase
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Number
              </label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="space-y-3">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:text-white"
                      />
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => updateItem(index, "cost", e.target.value)}
                        placeholder="Cost"
                        className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:text-white"
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="w-full rounded-lg bg-red-500/10 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500 hover:text-white transition-all"
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
              className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700 dark:text-gray-400"
            >
              + Add Item Row
            </button>

            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
              <div className="flex items-center justify-between font-bold text-brand-600 dark:text-brand-400">
                <span>Estimated Total</span>
                <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60 transition-all"
            >
              {submitting ? "Saving..." : "Create Purchase"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Purchase History
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading history...</p>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data purchase.</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.purchaseId}
                  className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold dark:text-white">{purchase.invoiceNumber || "No Invoice"}</h3>
                      <p className="text-xs text-gray-500">By: {purchase.user?.name || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-500">Rp {purchase.totalAmount.toLocaleString("id-ID")}</p>
                      <p className="text-[10px] text-gray-400">{new Date(purchase.createdAt).toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DETAIL + PRINT --- */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border dark:border-gray-800 flex flex-col">
            
            {/* AREA KHUSUS PRINT */}
            <div id="purchase-receipt" className="hidden print:block">
              <div className="text-center border-b border-dashed pb-3 mb-3">
                <h2 className="text-lg font-bold uppercase">{merchant?.merchantName || "KASIR ERP"}</h2>
                <p className="text-[10px]">PURCHASE ORDER</p>
                <p className="text-[10px]">{selectedPurchase.invoiceNumber}</p>
                <p className="text-[10px]">{new Date(selectedPurchase.createdAt).toLocaleString("id-ID")}</p>
              </div>

              <div className="space-y-1 mb-3">
                {selectedPurchase.items?.map((item, idx) => (
                  <div key={idx} className="text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span>{item.product?.name}</span>
                      <span>{(item.quantity * item.cost).toLocaleString()}</span>
                    </div>
                    <div className="text-[9px]">{item.quantity} x {item.cost.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed pt-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL PEMBELIAN</span>
                  <span>Rp {selectedPurchase.totalAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="mt-5 text-center text-[9px] italic">
                <p>Oleh: {selectedPurchase.user?.name || "-"}</p>
                <p>Dokumen Internal Pembelian Barang</p>
              </div>
            </div>

            {/* Tampilan UI Modal */}
            <div className="no-print flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center border-b pb-3 dark:border-gray-800">
                <h3 className="text-xl font-bold dark:text-white">Detail Pembelian</h3>
                <button onClick={() => setSelectedPurchase(null)} className="text-gray-400 text-2xl">&times;</button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 text-sm bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-500">Invoice</span>
                  <span className="text-right font-mono dark:text-gray-300">{selectedPurchase.invoiceNumber || "-"}</span>
                  <span className="text-gray-500">Buyer</span>
                  <span className="text-right dark:text-gray-300">{selectedPurchase.user?.name || "-"}</span>
                </div>

                <div className="rounded-xl border dark:border-gray-800 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                      <tr>
                        <th className="p-3 font-medium">Produk</th>
                        <th className="p-3 text-center font-medium">Qty</th>
                        <th className="p-3 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {selectedPurchase.items?.map((item, idx) => (
                        <tr key={idx} className="dark:text-gray-300">
                          <td className="p-3 font-medium">{item.product?.name}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">Rp {(item.quantity * item.cost).toLocaleString("id-ID")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-right pt-2">
                  <p className="text-gray-500 text-xs">Total Pembelian</p>
                  <p className="text-2xl font-black text-brand-500">Rp {selectedPurchase.totalAmount.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={handlePrint} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all">
                  Print Struk
                </button>
                <button onClick={() => setSelectedPurchase(null)} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}