"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type StockLog = {
  id: string;
  type: string;
  quantity: number;
  prevQuantity: number;
  newQuantity: number;
  note: string;
  createdAt: string;
  user: { name: string }; 
};

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
  lastAdjustedBy?: string; 
  lastAdjustedRole?: string; 
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

  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<StockLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. DIBUNGKUS useCallback AGAR AMAN DARI ERROR useEffect
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
    } catch (err: unknown) { // 2. GANTI 'any' JADI 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Gagal memuat stok");
      }
    } finally {
      setLoading(false);
    }
  }, [search, lowOnly]); // Dependency array untuk loadStocks

  async function loadHistory(productId: string) {
    try {
      setLoadingHistory(true);
      setHistoryId(productId);
      const result = await api.get<{ success: boolean; data: StockLog[] }>(
        `/stocks/${productId}/history`,
        true
      );
      setHistoryLogs(result.data || []);
    } catch (err: unknown) { // GANTI 'any' JADI 'unknown'
      console.error("Gagal memuat riwayat", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // 3. SEKARANG useEffect SUDAH AMAN DAN TIDAK MERAH
  useEffect(() => {
    const fetchStok = async () => {
      await loadStocks();
    };
    fetchStok();
  }, [loadStocks]);

  async function handleAdjust(productId: string) {
    if (Number(adjustForm.quantity) <= 0 && adjustForm.type !== "set") {
      alert("Quantity harus lebih dari 0");
      return;
    }
    if (!adjustForm.note.trim()) {
      alert("Note/Alasan wajib diisi!");
      return;
    }

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
      setAdjustForm({ type: "add", quantity: "0", note: "" });
      
      await loadStocks(); 
    } catch (err: unknown) { // GANTI 'any' JADI 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Gagal adjustment stok");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory Management</h1>
            <p className="mt-1 text-sm text-gray-500">Kelola stok dan pantau riwayat perubahan barang.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStocks()}
              placeholder="Cari SKU atau Nama..."
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700"
            />
            <button onClick={loadStocks} className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">Refresh</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50">
              <tr className="text-[11px] uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4 text-left">Info Produk</th>
                <th className="px-6 py-4 text-center">Jumlah Stok</th>
                <th className="px-6 py-4 text-left">Pengubah Terakhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Memuat data inventaris...</td></tr>
              ) : items.map((item) => (
                <React.Fragment key={item.stockId}>
                  <tr className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">{item.productName}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{item.sku || "NO-SKU"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-black ${item.isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-800 dark:text-gray-200">
                               {item.lastAdjustedBy || "System"}
                            </span>
                            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 uppercase">
                               {merchant?.role || "USER"}
                            </span>
                          </div>
                          <span className="text-gray-400 mt-1">
                            {new Date(item.updatedAt).toLocaleString('id-ID')}
                          </span>
                          <button 
                            onClick={() => loadHistory(item.productId)}
                            className="text-brand-500 hover:underline text-left mt-1 text-[10px] font-bold"
                          >
                            LIHAT LOG DETAIL →
                          </button>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setAdjustingId(adjustingId === item.productId ? null : item.productId)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
                      >
                        Adjust Stok
                      </button>
                    </td>
                  </tr>

                  {/* Form Adjustment */}
                  {adjustingId === item.productId && (
                    <tr className="bg-brand-50/10">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:bg-gray-800">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe Perubahan</label>
                              <select 
                                value={adjustForm.type}
                                onChange={(e) => setAdjustForm(f => ({...f, type: e.target.value}))}
                                className="w-full mt-1 rounded-xl border-gray-200 text-sm p-2.5 dark:bg-gray-700"
                              >
                                <option value="add">Barang Masuk (Restock)</option>
                                <option value="subtract">Barang Keluar (Rusak/Hilang)</option>
                                <option value="set">Update Stok Total (Opname)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Jumlah</label>
                              <input 
                                type="number" 
                                value={adjustForm.quantity}
                                onChange={(e) => setAdjustForm(f => ({...f, quantity: e.target.value}))}
                                className="w-full mt-1 rounded-xl border-gray-200 text-sm p-2.5 dark:bg-gray-700"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Alasan (Wajib)</label>
                              <input 
                                type="text" 
                                value={adjustForm.note}
                                onChange={(e) => setAdjustForm(f => ({...f, note: e.target.value}))}
                                placeholder="Kenapa stok diubah?"
                                className="w-full mt-1 rounded-xl border-gray-200 text-sm p-2.5 dark:bg-gray-700"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setAdjustingId(null)} className="flex-1 py-2.5 text-xs font-bold text-gray-500 border rounded-xl">Batal</button>
                              <button onClick={() => handleAdjust(item.productId)} className="flex-1 py-2.5 text-xs font-bold text-white bg-brand-600 rounded-xl">Simpan</button>
                            </div>
                          </div>
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

      {/* Modal Riwayat Detail */}
      {historyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold">Riwayat Stok Produk</h2>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Log Audit Inventaris</p>
              </div>
              <button onClick={() => setHistoryId(null)} className="p-2 hover:bg-gray-100 rounded-full transition">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4">
              {loadingHistory ? (
                <p className="text-center py-10">Mengambil data...</p>
              ) : historyLogs.length === 0 ? (
                <p className="text-center py-10 text-gray-500">Belum ada riwayat perubahan stok.</p>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/30 dark:bg-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg ${
                        log.type === 'add' ? 'bg-emerald-100 text-emerald-700' : 
                        log.type === 'subtract' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.type === 'add' ? 'STOK MASUK' : log.type === 'subtract' ? 'STOK KELUAR' : 'OPNAME'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(log.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400">{log.prevQuantity}</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-sm font-black text-brand-600">{log.newQuantity}</span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-auto">
                        {log.type === 'add' ? '+' : '-'}{log.quantity}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic"> {log.note} </p>
                      <div className="mt-2 flex items-center gap-2">
                         <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">
                           {log.user?.name.charAt(0)}
                         </div>
                         <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{log.user?.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}