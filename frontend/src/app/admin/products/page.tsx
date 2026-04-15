"use client";

import React, { FormEvent, useEffect, useState, useRef, useMemo } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  function handleOpenCreate() {
    setEditingProduct(null);
    setForm({
      name: "",
      sku: "",
      categoryId: "",
      unitId: "",
      price: "",
      reorderPoint: "5",
      initialStock: "0",
    });
    setShowModal(true);
  }

  function handleOpenEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku || "",
      categoryId: product.category?.id || "",
      unitId: product.unit?.id || "",
      price: String(product.price),
      reorderPoint: String(product.reorderPoint),
      initialStock: String(product.stock),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        categoryId: form.categoryId || null,
        unitId: form.unitId || null,
        price: Number(form.price),
        reorderPoint: Number(form.reorderPoint),
        initialStock: editingProduct ? undefined : Number(form.initialStock),
      };

      if (editingProduct) {
        await api.patch(`/master/products/${editingProduct.id}`, payload, true);
        setSuccess("Produk berhasil diperbarui!");
      } else {
        await api.post("/master/products", payload, true);
        setSuccess("Produk berhasil ditambahkan!");
      }

      setShowModal(false);
      setTimeout(() => setSuccess(""), 3000);
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan produk");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(product: Product) {
    const action = product.status === "active" ? "nonaktifkan" : "aktifkan";
    if (!window.confirm(`Yakin ingin ${action} produk "${product.name}"?`)) return;

    try {
      if (product.status === "active") {
        await api.patch(`/master/products/${product.id}/deactivate`, {}, true);
      } else {
        await api.patch(`/master/products/${product.id}/activate`, {}, true);
      }
      setSuccess(`Status produk ${product.name} diperbarui!`);
      setTimeout(() => setSuccess(""), 3000);
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status produk");
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filterCategory === "all" || item.category?.id === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [items, search, filterCategory]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-theme-sm dark:bg-white/5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            Inventory Master
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
             Manajemen stok dan varian produk merchant
          </p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={handleOpenCreate}
             className="flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-black text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all active:scale-95"
           >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Produk Baru
           </button>
        </div>
      </div>

      {success && (
        <div className="rounded-2xl bg-emerald-500 p-4 text-center text-sm font-bold text-white shadow-lg animate-fade-in-up">
           {success}
        </div>
      )}

      {/* Main List & Controls */}
      <div className="rounded-3xl border border-gray-100 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/5 overflow-hidden">
        {/* Table Filters */}
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center border-b border-gray-50 dark:border-gray-800">
           <div className="relative flex-1">
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Nama Produk atau SKU..."
                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-11 pr-4 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-gray-800 dark:bg-white/2 transition"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
           </div>
           
           <div className="min-w-[200px]">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 text-sm font-bold text-gray-600 outline-none dark:bg-white/2 dark:border-gray-800 transition"
              >
                 <option value="all">Semua Kategori</option>
                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
           </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/30 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/2">
                 <tr>
                    <th className="px-6 py-5">Info Produk</th>
                    <th className="px-6 py-5">Kategori & Unit</th>
                    <th className="px-6 py-5 text-right">Harga Satuan</th>
                    <th className="px-6 py-5 text-center">Stok Saat Ini</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-center">Aksi</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                 {loading ? (
                    [1,2,3].map(i => <tr key={i}><td colSpan={6} className="px-6 py-8"><div className="h-4 w-full bg-gray-100 animate-pulse rounded"></div></td></tr>)
                 ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-30">Tidak Ada Produk Ditemukan</td></tr>
                 ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-brand-600 dark:bg-white/5">
                                  {item.name.charAt(0)}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-gray-900 dark:text-white leading-tight group-hover:text-brand-500 transition">{item.name}</p>
                                  <p className="mt-0.5 text-[10px] font-bold text-gray-400 tracking-tighter uppercase">{item.sku || "No SKU"}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                               <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.category?.name || "Uncategorized"}</span>
                               <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">{item.unit?.name || "-"}</span>
                            </div>
                         </td>
                         <td className="px-6 py-5 text-right font-black text-sm text-gray-900 dark:text-white">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.price)}
                         </td>
                         <td className="px-6 py-5 text-center">
                            <div className="inline-flex flex-col items-center">
                               <span className={`text-sm font-black ${item.stock <= item.reorderPoint ? 'text-rose-600' : 'text-emerald-600'}`}>{item.stock}</span>
                               <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Min: {item.reorderPoint}</span>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                               item.status === "active" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-gray-100 text-gray-400"
                            }`}>
                               {item.status}
                            </span>
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => handleOpenEdit(item)}
                                 className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition"
                                 title="Edit Product"
                               >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                               </button>
                               <button 
                                 onClick={() => handleToggleStatus(item)}
                                 className={`h-9 w-9 flex items-center justify-center rounded-xl transition ${
                                    item.status === "active" ? "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                 }`}
                                 title={item.status === "active" ? "Deactivate" : "Activate"}
                               >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     {item.status === "active" ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                     ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                     )}
                                  </svg>
                               </button>
                            </div>
                         </td>
                      </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Modal / Drawer for Product Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="relative w-full max-w-xl rounded-[40px] bg-white p-8 shadow-2xl dark:bg-gray-900 animate-fade-in-up">
              <div className="mb-8 flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                       {editingProduct ? "Update Produk" : "Tambah Produk Baru"}
                    </h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Lengkapi informasi produk di bawah</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="rounded-2xl bg-gray-50 p-3 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition dark:bg-white/5">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <Input label="Nama Produk" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} placeholder="Contoh: Kopi Gula Aren" required />
                    </div>
                    <div>
                       <Input label="SKU (Opsional)" value={form.sku} onChange={v => setForm(f => ({...f, sku: v}))} placeholder="SKU-001" />
                    </div>
                    <div>
                       <Input label="Harga Satuan (Rp)" type="number" value={form.price} onChange={v => setForm(f => ({...f, price: v}))} placeholder="0" required />
                    </div>
                    <div>
                       <Select label="Kategori" value={form.categoryId} onChange={v => setForm(f => ({...f, categoryId: v}))} options={categories.map(c => ({label: c.name, value: c.id}))} />
                    </div>
                    <div>
                       <Select label="Satuan (Unit)" value={form.unitId} onChange={v => setForm(f => ({...f, unitId: v}))} options={units.map(u => ({label: u.name, value: u.id}))} />
                    </div>
                    <div>
                       <Input label="Titik Restock (Min)" type="number" value={form.reorderPoint} onChange={v => setForm(f => ({...f, reorderPoint: v}))} placeholder="5" />
                    </div>
                    {!editingProduct && (
                       <div>
                          <Input label="Stok Awal" type="number" value={form.initialStock} onChange={v => setForm(f => ({...f, initialStock: v}))} placeholder="0" />
                       </div>
                    )}
                 </div>

                 {error && <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-500 border border-rose-100">{error}</div>}

                 <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 py-4 text-sm font-black text-gray-500 hover:bg-gray-100 transition">Batal</button>
                    <button type="submit" disabled={submitting} className="flex-[2] rounded-2xl bg-brand-500 py-4 text-sm font-black text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-95 transition">
                       {submitting ? "Memproses..." : editingProduct ? "Simpan Perubahan" : "Tambahkan Sekarang"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required }: any) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-brand-500 focus:bg-white dark:bg-white/5 dark:border-gray-800 dark:text-white transition"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find((o: any) => o.value === value);

  return (
    <div ref={wrapperRef} className="w-full">
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
      <div className="relative">
        <div
          className="flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 px-4 text-sm font-bold dark:bg-white/5 dark:border-gray-800"
          onClick={() => { setIsOpen(!isOpen); setQuery(""); }}
        >
          <span className={selected ? "text-gray-900 dark:text-white" : "text-gray-400"}>
            {selected ? selected.label : `Pilih ${label}`}
          </span>
          <svg className={`h-4 w-4 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl dark:bg-gray-800 dark:border-gray-700">
            <input
              autoFocus
              className="mb-2 h-10 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 text-xs outline-none focus:border-brand-500 dark:bg-white/5 dark:border-white/10"
              placeholder="Cari..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <ul className="max-h-48 overflow-y-auto">
              <li onClick={() => { onChange(""); setIsOpen(false); }} className="cursor-pointer rounded-xl px-4 py-2 text-xs text-gray-400 hover:bg-gray-50">-- Kosongkan --</li>
              {filtered.map((o: any) => (
                <li
                  key={o.value}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition ${value === o.value ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"}`}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                >
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}