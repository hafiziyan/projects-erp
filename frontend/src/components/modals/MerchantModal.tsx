"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveActiveMerchant, getActiveMerchant } from "@/lib/auth"; // Import getActiveMerchant
import { useMerchantModal } from "@/context/MerchantModalContext";

export default function MerchantModal() {
  const { modalType, closeModal, openCreateMerchant, openSelectMerchant } = useMerchantModal();
  const router = useRouter();

  // Select State
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentActiveId, setCurrentActiveId] = useState<string | null>(null);

  // Create State
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (modalType === "select") {
      // Ambil ID merchant yang sedang aktif dari session
      const active = getActiveMerchant();
      if (active) setCurrentActiveId(active.merchantId);
      
      fetchMerchants();
    } else if (modalType === "create") {
      setError("");
      setSuccess("");
      setForm({ name: "", address: "", phone: "" });
    }
  }, [modalType]);

  async function fetchMerchants() {
    try {
      setLoading(true);
      const response = await api.get<any>("/auth/me");
      setMerchants(response.data?.merchants || []);
    } catch (err) {
      console.error("Gagal mengambil data merchant", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (merchant: any) => {
    // Jika memilih merchant yang sama, cukup tutup modal
    if (merchant.merchantId === currentActiveId) {
      closeModal();
      return;
    }
    
    saveActiveMerchant(merchant);
    closeModal();
    window.location.reload(); 
  };

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.post<any>("/merchants", form);
      setSuccess(result.message || "Merchant berhasil dibuat");
      
      saveActiveMerchant({
        merchantUserId: result.data.membership.merchantUserId,
        merchantId: result.data.merchant.id,
        merchantName: result.data.merchant.name,
        role: result.data.membership.role,
      });

      setTimeout(() => {
        closeModal();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Gagal membuat merchant");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!modalType) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in zoom-in duration-200 relative">
        <button
          onClick={closeModal}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {modalType === "select" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pilih Merchant</h2>
              <p className="text-sm text-gray-500 mt-1">Silakan pilih unit bisnis/cabang untuk beralih konteks kerja.</p>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {loading ? (
                <div className="py-10 text-center">
                   <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                </div>
              ) : merchants.length === 0 ? (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500">
                  Kamu belum memiliki akses ke merchant/toko manapun.
                </div>
              ) : (
                merchants.map((item: any) => {
                  const isActive = item.merchantId === currentActiveId;
                  
                  return (
                    <button
                      key={item.merchantId}
                      onClick={() => handleSelect(item)}
                      className={`group flex w-full items-center justify-between rounded-2xl border p-4 transition-all text-left ${
                        isActive 
                          ? "border-brand-500 bg-brand-50/30 dark:bg-brand-500/10 cursor-default" 
                          : "border-gray-100 bg-gray-50/50 hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-brand-400"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${
                          isActive ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {item.merchantName.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
                            {item.merchantName}
                          </p>
                          <span className="inline-block mt-1 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-black uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            Role: {item.role}
                          </span>
                        </div>
                      </div>

                      {/* Indikator Status Aktif */}
                      {isActive ? (
                        <div className="flex items-center gap-2 rounded-full bg-brand-500 px-3 py-1 shadow-sm shadow-brand-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                          <span className="text-[10px] font-black uppercase text-white tracking-wider">Aktif</span>
                        </div>
                      ) : (
                        <div className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
               <button onClick={openCreateMerchant} className="text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400">
                  + Buat Merchant Baru
               </button>
            </div>
          </div>
        )}

        {modalType === "create" && (
          <div>
            <div className="mb-6">
              <button 
                 onClick={openSelectMerchant} 
                 className="mb-4 inline-flex items-center text-xs font-bold text-gray-500 hover:text-brand-600 transition"
              >
                 ← Kembali ke Pilihan Merchant
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Buat Merchant Baru</h2>
              <p className="text-sm text-gray-500 mt-1">Daftarkan bisnis atau cabang baru Anda.</p>
            </div>

             <form onSubmit={handleCreateSubmit} className="space-y-4">
               <div>
                 <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">Nama Merchant *</label>
                 <input
                   required
                   value={form.name}
                   onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                   placeholder="Contoh: Toko Antigravity Central"
                   className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400 dark:focus:bg-gray-900 transition-all font-medium"
                 />
               </div>
               
               <div>
                 <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">Alamat</label>
                 <input
                   value={form.address}
                   onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                   placeholder="Alamat lengkap (opsional)"
                   className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400 dark:focus:bg-gray-900 transition-all font-medium"
                 />
               </div>
               
               <div>
                 <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">Nomor Telepon</label>
                 <input
                   value={form.phone}
                   onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                   placeholder="0812xxxxxx (opsional)"
                   className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400 dark:focus:bg-gray-900 transition-all font-medium"
                 />
               </div>

               {error && (
                 <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
                   {error}
                 </div>
               )}

               {success && (
                 <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-400">
                   {success}
                 </div>
               )}

               <button
                 type="submit"
                 disabled={createLoading}
                 className="w-full mt-4 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 disabled:opacity-60 transition-all active:scale-[0.98]"
               >
                 {createLoading ? "Creating..." : "Daftarkan Merchant"}
               </button>
             </form>
          </div>
         )}
      </div>
    </div>
  );
}