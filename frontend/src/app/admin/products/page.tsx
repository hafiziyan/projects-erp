"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Category = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  reorderPoint: number;
  status: "active" | "inactive";
  stock: number;
  category: Category | null;
  unit: Unit | null;
};

export default function ProductsPage() {
  const merchant = getActiveMerchant();
<<<<<<< Updated upstream
=======
  const [isMounted, setIsMounted] = useState(false);
>>>>>>> Stashed changes

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    unitId: "",
    price: "",
    reorderPoint: "5",
    initialStock: "0",
  });

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [productRes, categoryRes, unitRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>("/master/products", true),
        api.get<{ success: boolean; data: Category[] }>("/master/categories", true),
        api.get<{ success: boolean; data: Unit[] }>("/master/units", true),
      ]);

      setItems(productRes.data || []);
      setCategories(categoryRes.data || []);
      setUnits(unitRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/master/products",
        {
          name: form.name,
          sku: form.sku || undefined,
          categoryId: form.categoryId || null,
          unitId: form.unitId || null,
          price: Number(form.price),
          reorderPoint: Number(form.reorderPoint),
          initialStock: Number(form.initialStock),
        },
        true
      );

      setForm({
        name: "",
        sku: "",
        categoryId: "",
        unitId: "",
        price: "",
        reorderPoint: "5",
        initialStock: "0",
      });

      setIsModalOpen(false);
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Gagal menambah produk");
    } finally {
      setSubmitting(false);
    }
  }

  // --- FUNGSI PERBAIKAN: TOGGLE STATUS (ACTIVATE/DEACTIVATE) ---
  async function handleToggleStatus(id: string, currentStatus: string) {
    const isNowActive = currentStatus === "active";
    const actionText = isNowActive ? "Nonaktifkan" : "Aktifkan kembali";
    
    const ok = window.confirm(`${actionText} produk ini?`);
    if (!ok) return;

    try {
      setError("");
      // Jika sekarang aktif, tembak endpoint deactivate. Jika tidak, tembak activate.
      const endpoint = isNowActive 
        ? `/master/products/${id}/deactivate` 
        : `/master/products/${id}/activate`;

      await api.patch(endpoint, {}, true);
      await loadAll(); // Refresh list data
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status produk");
    }
  }

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
<<<<<<< Updated upstream
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Products
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {merchant?.merchantName || "-"}
        </p>
=======
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[2rem] border border-white bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Products
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            Merchant: {isMounted ? (merchant?.merchantName || "-") : "-"}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:opacity-80 active:scale-95"
        >
          + Add Product
        </button>
>>>>>>> Stashed changes
      </div>

      {/* LIST SECTION */}
      <div className="rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:border-gray-800 dark:bg-white/5">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Product Inventory
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-11 w-full max-w-xs rounded-2xl border-none bg-gray-100 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

<<<<<<< Updated upstream
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada produk.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white/90">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        SKU: {item.sku || "-"} • Category: {item.category?.name || "-"} • Unit:{" "}
                        {item.unit?.name || "-"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Price: Rp {item.price.toLocaleString("id-ID")} • Stock: {item.stock} •
                        Reorder Point: {item.reorderPoint}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.status === "active" && (
                        <button
                          onClick={() => handleDeactivate(item.id)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
                        >
                          Deactivate
                        </button>
                      )}
=======
        {loading ? (
          <p className="text-sm text-gray-500">Loading experience...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada produk.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group rounded-[2rem] border border-gray-50 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                      SKU: {item.sku || "N/A"} • {item.category?.name || "No Category"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <span className="text-blue-600 font-bold">Rp {item.price.toLocaleString("id-ID")}</span>
                      <span>Stock: {item.stock} {item.unit?.name}</span>
>>>>>>> Stashed changes
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${
                        item.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                      }`}
                    >
                      {item.status}
                    </span>
                    
                    {/* TOMBOL TOGGLE STATUS (PERBAIKAN) */}
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className={`text-[11px] font-bold opacity-0 transition-opacity group-hover:opacity-100 ${
                        item.status === "active" 
                        ? "text-red-400 hover:text-red-600" 
                        : "text-green-500 hover:text-green-700"
                      }`}
                    >
                      {item.status === "active" ? "Deactivate" : "Activate Product"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md transition-opacity"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative w-full max-w-2xl transform rounded-[2.5rem] bg-white/95 p-8 shadow-2xl transition-all dark:bg-gray-900/95 border border-white dark:border-gray-800">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Add New Product
                </h3>
                <p className="text-sm text-gray-500">Fill in the details for the new inventory item.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors dark:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Product Name"
                value={form.name}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="e.g. Arabica Coffee"
              />
              <Input
                label="SKU"
                value={form.sku}
                onChange={(v) => setForm((p) => ({ ...p, sku: v }))}
                placeholder="SKU-001"
              />

              <Select
                label="Category"
                value={form.categoryId}
                onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
                options={categories.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
              />

              <Select
                label="Unit"
                value={form.unitId}
                onChange={(v) => setForm((p) => ({ ...p, unitId: v }))}
                options={units.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
              />

              <Input
                label="Price"
                type="number"
                value={form.price}
                onChange={(v) => setForm((p) => ({ ...p, price: v }))}
                placeholder="0"
              />

              <div className="grid grid-cols-2 gap-4 text-left">
                <Input
                  label="Reorder Pt"
                  type="number"
                  value={form.reorderPoint}
                  onChange={(v) => setForm((p) => ({ ...p, reorderPoint: v }))}
                />
                <Input
                  label="Initial Stock"
                  type="number"
                  value={form.initialStock}
                  onChange={(v) => setForm((p) => ({ ...p, initialStock: v }))}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mt-4 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-500 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {submitting ? "Saving..." : "Create Product"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

<<<<<<< Updated upstream
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
=======
function Input({ label, value, onChange, placeholder, type = "text" }: any) {
>>>>>>> Stashed changes
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border-none bg-gray-100 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

<<<<<<< Updated upstream
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
      >
        <option value="">Select {label}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
=======
function Select({ label, value, onChange, options }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div ref={wrapperRef} className="space-y-1.5 text-left">
      <label className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-400">
        {label}
      </label>
      <div className="relative">
        <div
          className="flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl bg-gray-100 px-4 text-sm font-medium dark:bg-gray-800 dark:text-white"
          onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        >
          <span className={selectedOption ? "" : "text-gray-400"}>
            {selectedOption ? selectedOption.label : `Select ${label}`}
          </span>
          <svg className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 z-[100] mt-2 w-full overflow-hidden rounded-[1.5rem] border border-white bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:bg-gray-800 dark:border-gray-700">
            <input
              type="text"
              autoFocus
              className="mb-2 h-10 w-full rounded-xl bg-gray-100 px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <ul className="max-h-48 overflow-y-auto">
              <li
                className="cursor-pointer rounded-xl px-4 py-2 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { onChange(""); setIsOpen(false); }}
              >
                None
              </li>
              {filteredOptions.map((opt: any) => (
                <li
                  key={opt.value}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    value === opt.value ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
>>>>>>> Stashed changes
    </div>
  );
}