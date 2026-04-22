"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Unit = {
  id: string;
  name: string;
};

export default function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const merchant = getActiveMerchant();

  // --- STATE UNTUK MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");

  async function loadUnits() {
    try {
      setLoading(true);
      setError("");
      const result = await api.get<{ success: boolean; data: Unit[] }>(
        "/master/units",
        true
      );
      setItems(result.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat unit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
  }, []);

<<<<<<< Updated upstream
  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
=======
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
>>>>>>> Stashed changes

    try {
      setSubmitting(true);
      setError("");
<<<<<<< Updated upstream
      await api.post("/master/units", { name }, true);
      setName("");
=======
      await api.post("/master/units", { name: newName.trim() }, true);
      
      setNewName(""); 
      setIsModalOpen(false); // Tutup modal setelah sukses
>>>>>>> Stashed changes
      await loadUnits();
    } catch (err: any) {
      setError(err.message || "Gagal menambah unit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      setSubmitting(true);
      setError("");
      await api.patch(`/master/units/${id}`, { name: editName }, true);
      setEditId(null);
      setEditName("");
      await loadUnits();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah unit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Hapus unit ini?");
    if (!ok) return;

    try {
      setError("");
      await api.delete(`/master/units/${id}`, true);
      await loadUnits();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus unit");
    }
  }

<<<<<<< Updated upstream
=======
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

>>>>>>> Stashed changes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
<<<<<<< Updated upstream
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Units
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {merchant?.merchantName || "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Add Unit
          </h2>
=======
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Master Units
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Merchant: {merchant?.merchantName || "-"} | Data unit berlaku secara global.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <span className="text-lg">+</span> Tambah Unit Baru
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari unit (misal: Pcs, Kg)..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-4 pr-10 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
>>>>>>> Stashed changes

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unit Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pcs"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
              />
            </div>

<<<<<<< Updated upstream
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add Unit"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Unit List
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada unit.
            </p>
=======
        {/* List Content */}
        <div className="mt-4">
          <h3 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            Daftar Unit Tersedia ({filteredItems.length})
          </h3>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading units...</p>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Unit tidak ditemukan.
              </p>
            </div>
>>>>>>> Stashed changes
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
<<<<<<< Updated upstream
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between"
                >
                  {editId === item.id ? (
                    <div className="flex w-full flex-col gap-3 md:flex-row">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(item.id)}
                          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white/90">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">ID: {item.id}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditId(item.id);
                            setEditName(item.name);
                          }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
=======
                  className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/30 px-3 py-3 hover:border-brand-500 dark:border-gray-800 dark:bg-white/5 dark:hover:border-brand-500 transition-all"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                    title="Hapus"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
>>>>>>> Stashed changes
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL POP-UP TAMBAH UNIT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border dark:border-gray-800 animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between border-b pb-4 dark:border-gray-800">
              <h3 className="text-xl font-bold dark:text-white">Tambah Unit Baru</h3>
              <button 
                onClick={() => {
                    setIsModalOpen(false);
                    setNewName("");
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Unit
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Misal: Liter, Box, Meter..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Pastikan nama unit belum ada dalam daftar untuk menghindari duplikasi.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewName("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Menyimpan..." : "Simpan Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}