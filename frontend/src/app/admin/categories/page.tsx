"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const merchant = getActiveMerchant();

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");
      const result = await api.get<{ success: boolean; data: Category[] }>(
        "/master/categories",
        true
      );
      setItems(result.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat kategori");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(newName: string) {
    if (!newName.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      await api.post("/master/categories", { name: newName }, true);
      setSearch(""); // Reset search setelah sukses tambah
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Gagal menambah kategori");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Hapus kategori ini? (Hanya bisa menghapus kategori yang Anda buat sendiri)");
    if (!ok) return;

    try {
      setError("");
      await api.delete(`/master/categories/${id}`, true);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus kategori. Anda mungkin tidak berhak atau data sedang dipakai.");
    }
  }

  // Logika Pencarian Client Side
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cek apakah ada kategori yang namanya PERSIS sama dengan yg diketik
  const exactMatchExists = items.some(
    (item) => item.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Master Categories
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {merchant?.merchantName || "-"} | Data kategori berlaku secara global.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Cari atau Tambah Kategori Baru
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kategori (misal: Minuman)..."
            className="h-11 w-full max-w-md rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
          />

          {/* Munculkan tombol tambah JIKA text diisi & nama persis tidak ada di list */}
          {search.trim() !== "" && !exactMatchExists && (
            <button
              onClick={() => handleCreate(search.trim())}
              disabled={submitting}
              className="block rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : `+ Tambah Kategori "${search.trim()}"`}
            </button>
          )}
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Daftar Kategori Tersedia ({filteredItems.length})
          </h3>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kategori tidak ditemukan. Silakan tambahkan!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.name}
                  </span>
                  {/* Tombol Delete akan muncul saat hover, (opsional: bisa dihapus jika tidak mau ada delete) */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="hidden text-xs text-red-500 hover:text-red-700 group-hover:block"
                    title="Hapus"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}