"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth"; // Import helper auth
import { useMerchantModal } from "@/context/MerchantModalContext";

type Merchant = {
  merchantId: string;
  merchantName: string;
  address: string | null;
  phone: string | null;
  merchantStatus: string;
  role: string;
};

export default function MerchantsManagementPage() {
  const { openCreateMerchant } = useMerchantModal();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // --- STATE UNTUK MENYIMPAN ID MERCHANT YANG SEDANG AKTIF ---
  const [currentActiveId, setCurrentActiveId] = useState<string | null>(null);

  useEffect(() => {
    loadMerchants();
    // Ambil data merchant yang sedang aktif digunakan di session ini
    const active = getActiveMerchant();
    if (active) setCurrentActiveId(active.merchantId);
  }, []);

  async function loadMerchants() {
    try {
      setLoading(true);
      const res = await api.get<{ data: Merchant[] }>("/merchants/my");
      setMerchants(res.data || []);
    } catch (err: any) {
      setError("Gagal memuat daftar merchant");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(m: Merchant) {
    setEditingId(m.merchantId);
    setEditForm({
      name: m.merchantName,
      address: m.address || "",
      phone: m.phone || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      setSaving(true);
      await api.put(`/merchants/${editingId}`, editForm);
      setEditingId(null);
      await loadMerchants();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui merchant");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(m: Merchant) {
    const isCurrentlyActive = m.merchantStatus === "active";
    const actionText = isCurrentlyActive ? "menonaktifkan sementara" : "mengaktifkan kembali";
    
    if (!confirm(`Apakah Anda yakin ingin ${actionText} cabang "${m.merchantName}"?`)) return;
    
    try {
      await api.patch(`/merchants/${m.merchantId}/status`, { 
        merchantStatus: isCurrentlyActive ? "inactive" : "active" 
      });
      await loadMerchants();
    } catch (err: any) {
      alert(err.message || `Gagal ${actionText} merchant`);
    }
  }

  async function handleDelete(m: Merchant) {
    if (m.merchantStatus === "active") {
      alert("HIMBAUAN:\nToko tidak dapat dihapus karena masih berstatus AKTIF.\n\nSilakan nonaktifkan toko ini terlebih dahulu jika Anda ingin menghapusnya secara permanen.");
      return;
    }

    if (!confirm(`PERINGATAN BAHAYA!\nApakah Anda yakin ingin MENGHAPUS PERMANEN cabang "${m.merchantName}"?\nSemua data yang terkait mungkin akan hilang.`)) return;
    
    try {
      await api.delete(`/merchants/${m.merchantId}`);
      await loadMerchants();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus merchant secara permanen");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Daftar Cabang & Toko</h1>
          <p className="text-sm font-bold text-brand-500 uppercase tracking-widest mt-1">Merchant Management</p>
        </div>
        <button
          onClick={openCreateMerchant}
          className="flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-black text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Cabang Baru
        </button>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/2">
              <tr>
                <th className="px-6 py-5">Nama Branch</th>
                <th className="px-6 py-5 uppercase">Alamat & Kontak</th>
                <th className="px-6 py-5 uppercase text-center">Status</th>
                <th className="px-6 py-5 uppercase">Role Anda</th>
                <th className="px-6 py-5 uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="animate-pulse flex items-center justify-center gap-2 text-gray-400 font-bold">
                         <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500"></div>
                         Memuat Data Toko...
                      </div>
                   </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium">
                    Belum ada data merchant terdaftar.
                  </td>
                </tr>
              ) : (
                merchants.map((m) => {
                  // --- CEK APAKAH BARIS INI ADALAH TOKO YANG SEDANG AKTIF ---
                  const isActiveSession = currentActiveId === m.merchantId;

                  return (
                    <tr 
                      key={m.merchantId} 
                      className={`group transition-all ${
                        isActiveSession 
                          ? 'bg-brand-50/40 border-l-4 border-brand-500 dark:bg-brand-500/5' // Style khusus jika sedang dibuka
                          : m.merchantStatus === 'inactive' ? 'bg-gray-50/50 grayscale-[50%] dark:bg-gray-900/50' : 'hover:bg-gray-50/50 dark:hover:bg-white/2'
                      }`}
                    >
                      <td className="px-6 py-4">
                        {editingId === m.merchantId ? (
                          <input
                            className="h-9 w-full rounded-lg border border-brand-500 bg-white px-3 text-sm font-bold outline-none dark:bg-gray-800"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${isActiveSession ? 'bg-brand-500 text-white' : m.merchantStatus === 'active' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>
                              {m.merchantName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-black ${isActiveSession ? 'text-brand-600 dark:text-brand-400' : m.merchantStatus === 'active' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                {m.merchantName}
                              </span>
                              {isActiveSession && (
                                <span className="text-[9px] font-black uppercase tracking-tighter text-brand-500 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                                  Dashboard Terbuka
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === m.merchantId ? (
                          <div className="space-y-2">
                             <input
                              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs outline-none dark:bg-gray-800"
                              placeholder="Alamat"
                              value={editForm.address}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            />
                             <input
                              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs outline-none dark:bg-gray-800"
                              placeholder="Telepon"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5 min-w-[150px]">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                              {m.address || "Alamat belum diatur"}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400">
                              📞 {m.phone || "-"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          m.merchantStatus === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {m.merchantStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase dark:bg-indigo-500/10 dark:border-indigo-500/20">
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === m.merchantId ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleUpdate}
                              disabled={saving}
                              className="rounded-lg bg-emerald-500 p-1.5 text-white shadow-md shadow-emerald-500/20"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-gray-400 p-1.5 text-white"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 transition">
                            <button
                              onClick={() => startEdit(m)}
                              title="Edit Info Toko"
                              className="rounded-lg border border-gray-100 p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:border-gray-800 dark:hover:bg-white/5"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>

                            <button
                              onClick={() => handleToggleStatus(m)}
                              title={m.merchantStatus === 'active' ? "Nonaktifkan Toko" : "Aktifkan Toko"}
                              className={`rounded-lg border border-gray-100 p-2 dark:border-gray-800 ${
                                m.merchantStatus === 'active' 
                                  ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-500/10' 
                                  : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100'
                              }`}
                            >
                              {m.merchantStatus === 'active' ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              )}
                            </button>

                            <button
                              onClick={() => handleDelete(m)}
                              title="Hapus Permanen"
                              className={`rounded-lg border border-gray-100 p-2 dark:border-gray-800 transition ${
                                m.merchantStatus === 'active'
                                  ? 'text-gray-300 hover:bg-gray-100 cursor-not-allowed dark:text-gray-600'
                                  : 'text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 cursor-pointer'
                              }`}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}