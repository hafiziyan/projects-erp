"use client";

import React, { FormEvent, useEffect, useState, useRef } from "react";
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

  // Mencegah error Hydration (Tulisan merah dari React)
  const [isMounted, setIsMounted] = useState(false);

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
    setIsMounted(true);
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

      await loadAll();
    } catch (err: any) {
      setError(err.message || "Gagal menambah produk");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    const ok = window.confirm("Nonaktifkan produk ini?");
    if (!ok) return;

    try {
      setError("");
      await api.patch(`/master/products/${id}/deactivate`, {}, true);
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Gagal menonaktifkan produk");
    }
  }

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Products
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {isMounted ? (merchant?.merchantName || "-") : "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Add Product
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Product Name"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Contoh: Teh Botol"
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(v) => setForm((p) => ({ ...p, sku: v }))}
              placeholder="TB001"
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
              placeholder="5000"
            />

            <Input
              label="Reorder Point"
              type="number"
              value={form.reorderPoint}
              onChange={(v) => setForm((p) => ({ ...p, reorderPoint: v }))}
              placeholder="5"
            />

            <Input
              label="Initial Stock"
              type="number"
              value={form.initialStock}
              onChange={(v) => setForm((p) => ({ ...p, initialStock: v }))}
              placeholder="0"
            />

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
              {submitting ? "Saving..." : "Add Product"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Product List
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
            />
          </div>

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
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   KOMPONEN INPUT
===================================================================== */
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
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
      />
    </div>
  );
}

/* =====================================================================
   KOMPONEN SELECT (SUDAH DIUBAH MENJADI SEARCHABLE)
===================================================================== */
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
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown jika user klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter opsi berdasarkan ketikan
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  // Mendapatkan label dari opsi yang dipilih
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={wrapperRef} className="w-full">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div
          className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:text-white"
          onClick={() => {
            setIsOpen(!isOpen);
            setQuery(""); // Reset pencarian setiap dropdown dibuka
          }}
        >
          <span className={selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400"}>
            {selectedOption ? selectedOption.label : `Select ${label}`}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-2 dark:border-gray-700">
              <input
                type="text"
                autoFocus
                className="h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:text-white"
                placeholder="Cari..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()} // Supaya tidak tertutup saat diketik
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-2 text-sm text-gray-500">Tidak ada hasil</li>
              ) : (
                <>
                  <li
                    className="cursor-pointer px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                  >
                    -- Kosongkan Pilihan --
                  </li>
                  {filteredOptions.map((opt) => (
                    <li
                      key={opt.value}
                      className={`cursor-pointer px-4 py-2 text-sm hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 dark:text-white ${
                        value === opt.value
                          ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/20"
                          : ""
                      }`}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}