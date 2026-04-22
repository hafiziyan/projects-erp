"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

// Define strict types for better reliability
type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat kategori";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      await api.post("/master/categories", { name: newName.trim() }, true);
      
      setNewName("");
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menambah kategori";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Hapus kategori ini?");
    if (!ok) return;

    try {
      setError("");
      await api.delete(`/master/categories/${id}`, true);
      await loadCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menghapus kategori";
      setError(errorMessage);
    }
  }

  // Strictly typed filter
  const filteredItems = items.filter((item: Category) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-screen space-y-8 p-2 text-left">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Categories
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            {merchant?.merchantName || "General"} Merchant Database
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all active:scale-95"
        >
          + Add Category
        </button>
      </div>

      {/* Main Content Card */}
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-6 shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-none text-left">
        <div className="mb-8 text-left">
          <div className="relative max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="h-12 w-full rounded-2xl border-none bg-gray-100 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 dark:bg-white/10 dark:text-white outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-left">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-50 dark:bg-white/5" />
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400">
              Belum ada kategori.
            </div>
          ) : (
            filteredItems.map((item: Category) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-2xl border border-gray-50 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-white/5"
              >
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-tighter">ID: {item.id.slice(0, 8)}</span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-full p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* APPLE STYLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-6">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative w-full max-w-xl transform rounded-2rem bg-white/90 p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all dark:bg-gray-900/90 border border-white/20 text-left">
            <form onSubmit={handleCreate}>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  New Category
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Buat kategori induk baru untuk mengatur inventaris Anda.
                </p>
              </div>

              <div className="mt-8 text-left">
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama Kategori (misal: Minuman)"
                  className="h-14 w-full rounded-2xl border-none bg-gray-100 px-5 text-lg font-medium outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-32 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="w-full sm:w-48 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 active:scale-95 disabled:opacity-40 transition-all"
                >
                  {submitting ? "Menyimpan..." : "Buat Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}