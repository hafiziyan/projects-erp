"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type StockItem = {
  stockId: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  reorderPoint: number;
  isLowStock: boolean;
  status: string;
  price: number;
  category: { id: string; name: string } | null;
  unit: { id: string; name: string } | null;
  updatedAt: string;
};

export default function StocksPage() {
  const merchant = getActiveMerchant();

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  // --- STATE UNTUK MODAL ADJUSTMENT ---
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "add",
    quantity: "0",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // FIXED: Membungkus dengan useCallback agar aman sebagai dependensi useEffect
  const loadStocks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (lowOnly) query.set("lowStock", "true");

      const result = await api.get<{ success: boolean; data: StockItem[] }>(
        `/stocks${query.toString() ? `?${query.toString()}` : ""}`,
        true
      );

      setItems(result.data || []);
    } catch (err: unknown) {
      // FIXED: Menangani tipe 'unknown' dengan aman
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat stok";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [search, lowOnly]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStock) return;

    try {
      setSubmitting(true);
      setError("");
      await api.patch(
        `/stocks/${selectedStock.productId}/adjust`,
        {
          type: adjustForm.type,
          quantity: Number(adjustForm.quantity),
          note: adjustForm.note,
        },
        true
      );

      setSelectedStock(null);
      setAdjustForm({
        type: "add",
        quantity: "0",
        note: "",
      });
      await loadStocks();
    } catch (err: unknown) {
      // FIXED: Menghapus penggunaan 'any'
      const errorMessage = err instanceof Error ? err.message : "Gagal adjustment stok";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Stock Management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {merchant?.merchantName || "-"}
        </p>
      </div>

      {/* Filter & Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3 text-left">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="h-10 w-full md:w-64 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
            />
            <button
              onClick={loadStocks}
              className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Search
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-brand-500"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
            />
            Low stock only
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Stock List */}
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading stocks...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
            Tidak ada data stok yang ditemukan.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <div
                key={item.stockId}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 hover:border-brand-300 transition-colors text-left"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800 dark:text-white/90">
                      {item.productName}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 uppercase tracking-wider">
                      SKU: {item.sku || "N/A"} • Category: {item.category?.name || "Uncategorized"}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        Current Qty: <span className="font-bold text-gray-900 dark:text-white">{item.quantity}</span> {item.unit?.name}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Price: <span className="font-medium text-gray-900 dark:text-white">Rp {item.price.toLocaleString("id-ID")}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        item.isLowStock
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                      }`}
                    >
                      {item.isLowStock ? "Low Stock" : "Safe"}
                    </span>

                    <button
                      onClick={() => setSelectedStock(item)}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL ADJUSTMENT POP-UP --- */}
      {selectedStock && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border dark:border-gray-800 text-left">
            <div className="mb-6 flex items-center justify-between border-b pb-4 dark:border-gray-800">
              <div className="text-left">
                <h3 className="text-xl font-bold dark:text-white">Stock Adjustment</h3>
                <p className="text-sm text-gray-500">{selectedStock.productName}</p>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="flex justify-between text-sm p-3 bg-gray-50 dark:bg-white/5 rounded-lg mb-4">
                <span className="text-gray-500">Stok Saat Ini:</span>
                <span className="font-bold dark:text-white">{selectedStock.quantity} {selectedStock.unit?.name}</span>
              </div>

              <div className="text-left">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipe Penyesuaian
                </label>
                <select
                  value={adjustForm.type}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="add">Tambah Stok (+)</option>
                  <option value="subtract">Kurangi Stok (-)</option>
                  <option value="set">Set Manual (Opname)</option>
                </select>
              </div>

              <div className="text-left">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jumlah (Quantity)
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustForm.quantity}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-brand-500"
                  required
                />
              </div>

              <div className="text-left">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Catatan / Alasan
                </label>
                <textarea
                  value={adjustForm.note}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Contoh: Stok rusak, barang baru datang, atau stock opname"
                  className="w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-brand-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedStock(null)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}