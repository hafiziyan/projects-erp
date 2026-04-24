"use client";

import React, { useEffect, useState } from "react";
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

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "add",
    quantity: "0",
    note: "",
  });

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
        quantity: "0",
        note: "",
      });
      await loadStocks();
    } catch (err: any) {
      setError(err.message || "Gagal adjustment stok");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Inventory Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Merchant: <span className="font-medium text-gray-700 dark:text-gray-300">{merchant?.merchantName || "-"}</span>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadStocks()}
                placeholder="Search SKU or Name..."
                className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400 sm:w-64 transition-all"
              />
            </div>
            
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
              />
              Low Stock Only
            </label>
            
            <button
              onClick={loadStocks}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 flex items-start">
          <svg className="mr-3 h-5 w-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Product Info
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Pricing (Rp)
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Stock Level
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-transparent">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                      Membagikan data inventaris...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center py-6">
                      <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      Tidak ada data stok yang ditemukan.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <React.Fragment key={item.stockId}>
                    <tr className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.productName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            {item.sku || "NO-SKU"}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {item.category?.name || "Uncategorized"}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {item.unit?.name || "pcs"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {item.price.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col items-center justify-center text-sm">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                            <span className="text-lg">{item.quantity}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span title="Reserved Stock" className="flex items-center gap-1">
                               <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                               Res: {(item as any).reservedQuantity || 0}
                            </span>
                            <span title="Reorder Point" className="flex items-center gap-1">
                               <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                               Min: {item.reorderPoint}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            item.isLowStock
                              ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${item.isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                          {item.isLowStock ? "Low Stock" : "Sufficient"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setAdjustingId(adjustingId === item.productId ? null : item.productId)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 dark:hover:text-brand-400"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Adjust
                        </button>
                      </td>
                    </tr>
                    
                    {/** Expandable Adjustment Row **/}
                    {adjustingId === item.productId && (
                      <tr className="bg-brand-50/50 dark:bg-brand-900/10">
                        <td colSpan={5} className="px-6 py-4 border-l-4 border-brand-500">
                          <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-900/30 dark:bg-gray-900">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              New Adjustment Entry
                            </h4>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Action Type</label>
                                <select
                                  value={adjustForm.type}
                                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, type: e.target.value }))}
                                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="add">Add (Restock)</option>
                                  <option value="subtract">Subtract (Damage/Loss)</option>
                                  <option value="set">Set Exact Count</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={adjustForm.quantity}
                                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))}
                                  placeholder="0"
                                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Reference / Note</label>
                                <input
                                  type="text"
                                  value={adjustForm.note}
                                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, note: e.target.value }))}
                                  placeholder="e.g. Audit Bulanan"
                                  className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                              </div>

                              <div className="flex space-x-3">
                                <button
                                  onClick={() => setAdjustingId(null)}
                                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAdjust(item.productId)}
                                  className="w-full rounded-xl border border-transparent bg-brand-600 py-2.5 px-3 text-sm font-medium text-white shadow-sm hover:focus:ring-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors"
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}