"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";
import Link from "next/link"; 

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

type StockHistory = {
  id: string;
  type: "add" | "subtract" | "set" | "sale" | "return";
  adjustment: number;
  previousStock: number;
  currentStock: number;
  note: string;
  userName: string; 
  createdAt: string;
};

export default function StocksPage() {
  const merchant = getActiveMerchant();

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "add",
    quantity: "", 
    note: "",
  });

  const [historyId, setHistoryId] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadStocks() {
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
    } catch (err: any) {
      setError(err.message || "Gagal memuat stok");
    } finally {
      setLoading(false);
    }
  }

  // --- PERBAIKAN LOGIKA LOAD HISTORY ---
  // Tambahkan parameter `forceRefresh` agar sistem tahu kapan harus reload tanpa menutup panel
  async function loadHistory(productId: string, forceRefresh = false) {
    if (historyId === productId && !forceRefresh) {
      setHistoryId(null); // Tutup panel jika di-klik manual oleh user
      return;
    }

    try {
      setHistoryId(productId);
      setHistoryLoading(true);
      const result = await api.get<{ success: boolean; data: StockHistory[] }>(
        `/stocks/${productId}/history`,
        true
      );
      setStockHistory(result.data || []);
    } catch (err: any) {
      console.error("Gagal memuat histori", err);
    } finally {
      setHistoryLoading(false);
    }
  }
  // -------------------------------------

  useEffect(() => {
    loadStocks();
  }, [lowOnly]);

  async function handleAdjust(productId: string) {
    try {
      setError("");
      await api.patch(
        `/stocks/${productId}/adjust`,
        {
          type: adjustForm.type,
          quantity: Number(adjustForm.quantity),
          note: adjustForm.note,
        },
        true
      );

      setAdjustingId(null);
      setAdjustForm({
        type: "add",
        quantity: "", 
        note: "",
      });
      
      await loadStocks();
      
      // Jika history sedang terbuka saat adjust, panggil secara PAKSA (force refresh)
      if (historyId === productId) {
        await loadHistory(productId, true);
      }
    } catch (err: any) {
      setError(err.message || "Gagal adjustment stok");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory Management</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Merchant: <span className="font-medium text-gray-700 dark:text-gray-300">{merchant?.merchantName || "-"}</span>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadStocks()} placeholder="Search SKU or Name..." className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:w-64 transition-all" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Low Stock Only
            </label>
            <button onClick={loadStocks} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors">Refresh</button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product Info</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Pricing (Rp)</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Stock Level</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-transparent">
              {!loading && items.map((item) => (
                <React.Fragment key={item.stockId}>
                  <tr className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.productName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.sku || "NO-SKU"}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{item.category?.name || "Uncategorized"}</span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{item.unit?.name || "pcs"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900 dark:text-white">Rp {item.price.toLocaleString("id-ID")}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                      <div className="text-[10px] text-gray-400 mt-1">Min: {item.reorderPoint}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${item.isLowStock ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        {item.isLowStock ? "Low Stock" : "Sufficient"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.isLowStock && (
                          <Link
                            href={`/admin/purchases?productId=${item.productId}`}
                            className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                            title="Purchase / Restock"
                          >
                            Purchase
                          </Link>
                        )}
                        <button onClick={() => loadHistory(item.productId)} className="p-2 text-gray-500 hover:text-brand-600 transition-colors" title="View History">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button onClick={() => setAdjustingId(adjustingId === item.productId ? null : item.productId)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Adjust</button>
                      </div>
                    </td>
                  </tr>

                  {/* History & Adjust Forms */}
                  {historyId === item.productId && (
                    <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                      <td colSpan={5} className="px-6 py-4 border-l-4 border-brand-500">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-inner dark:border-gray-700 dark:bg-gray-900">
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Stock Movement History</h4>
                          {historyLoading ? (
                            <div className="py-4 text-center text-xs text-gray-400 animate-pulse">Loading history...</div>
                          ) : stockHistory.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-400">Belum ada catatan perubahan.</div>
                          ) : (
                            <div className="max-h-60 overflow-y-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-gray-100 dark:border-gray-800">
                                  <tr>
                                    <th className="pb-2 font-semibold">Date</th>
                                    <th className="pb-2 font-semibold">Type</th>
                                    <th className="pb-2 font-semibold text-right">Qty</th>
                                    <th className="pb-2 font-semibold text-right">Result</th>
                                    <th className="pb-2 font-semibold pl-4">Note / User</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                  {stockHistory.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                      <td className="py-2 text-gray-500">{new Date(h.createdAt).toLocaleString('id-ID')}</td>
                                      <td className="py-2 capitalize font-medium">{h.type}</td>
                                      <td className={`py-2 text-right font-bold ${h.adjustment > 0 ? 'text-emerald-500' : h.adjustment < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {h.adjustment > 0 ? `+${h.adjustment}` : h.adjustment}
                                      </td>
                                      <td className="py-2 text-right font-mono">{h.currentStock}</td>
                                      <td className="py-2 pl-4">
                                        <div className="text-gray-900 dark:text-gray-200">{h.note || "-"}</div>
                                        <div className="text-[10px] text-gray-400">by {h.userName}</div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {adjustingId === item.productId && (
                    <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                      <td colSpan={5} className="px-6 py-4 border-l-4 border-brand-500">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end bg-white p-5 rounded-xl border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
                          <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Type</label><select value={adjustForm.type} onChange={(e) => setAdjustForm((prev) => ({ ...prev, type: e.target.value }))} className="block w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"><option value="add">Add</option><option value="subtract">Subtract</option><option value="set">Set</option></select></div>
                          <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label><input type="number" min="0" placeholder="0" value={adjustForm.quantity} onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))} className="block w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                          <div><label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Note</label><input type="text" value={adjustForm.note} onChange={(e) => setAdjustForm((prev) => ({ ...prev, note: e.target.value }))} className="block w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                          <div className="flex space-x-3"><button onClick={() => setAdjustingId(null)} className="w-full rounded-xl border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white">Cancel</button><button onClick={() => handleAdjust(item.productId)} className="w-full rounded-xl bg-brand-600 py-2.5 px-3 text-sm font-medium text-white hover:bg-brand-700 transition">Confirm</button></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}