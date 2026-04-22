"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { saveActiveMerchant } from "@/lib/auth";

type Merchant = {
  merchantUserId: string;
  merchantId: string;
  merchantName: string;
  merchantStatus: string;
  role: string;
};

type MeResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
    merchants: Merchant[];
  };
};

function SelectMerchantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // --- STATE UNTUK MODAL ---
  const [selectedName, setSelectedName] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const result = await api.get<MeResponse>("/auth/me");
        setUserName(result.data.user.name);

        const merchantList = result.data.merchants || [];
        setMerchants(merchantList);

        if (merchantList.length === 0) {
          router.push("/create-merchant");
          return;
        }

        // Jika hanya ada 1 merchant dan bukan dari dashboard, langsung masuk
        if (merchantList.length === 1 && from !== "dashboard") {
          const m = merchantList[0];
          saveActiveMerchant({
            merchantUserId: m.merchantUserId,
            merchantId: m.merchantId,
            merchantName: m.merchantName,
            role: m.role,
          });
          router.push("/admin/dashboard");
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal memuat merchant";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, from]);

  const handleSelect = (merchant: Merchant) => {
    saveActiveMerchant({
      merchantUserId: merchant.merchantUserId,
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      role: merchant.role,
    });
    
    setSelectedName(merchant.merchantName);
    setShowModal(true);
    
    setTimeout(() => {
      router.push("/admin/dashboard");
    }, 1500);
  };

  const handleBack = () => {
    if (from === "dashboard") {
      router.push("/admin/dashboard");
    } else {
      router.push("/signin");
    }
  };

  return (
    <div className="w-full max-w-lg text-left">
      <div className="mb-5">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors dark:text-gray-400"
        >
          ← Kembali ke {from === "dashboard" ? "Dashboard" : "Sign In"}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Pilih Merchant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Halo {userName || "User"}, silakan pilih toko untuk mulai mengelola data.
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-gray-400 animate-pulse">Memuat daftar toko...</div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-10">
                <p className="text-gray-500 mb-4">Anda belum memiliki merchant.</p>
                <button 
                  onClick={() => router.push("/create-merchant")}
                  className="text-brand-500 font-semibold hover:underline"
                >
                    Buat Merchant Sekarang
                </button>
            </div>
          ) : (
            merchants.map((item) => (
              <button
                key={item.merchantUserId}
                onClick={() => handleSelect(item)}
                className="group flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-700 dark:hover:bg-white/5"
              >
                <div className="text-left flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 font-bold uppercase group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    {item.merchantName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white group-hover:text-brand-600">
                      {item.merchantName}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500 tracking-wider font-medium">Role: {item.role}</p>
                  </div>
                </div>
                <div className="text-brand-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  Pilih →
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL SUKSES PINDAH TOKO --- */}
      {showModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900 border dark:border-gray-800 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
              Toko Terpilih!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sekarang Anda mengelola <br/> <span className="font-bold text-gray-800 dark:text-white text-lg">{selectedName}</span>
            </p>
            <div className="mt-6 flex justify-center">
                <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 animate-pulse w-full"></div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SelectMerchantPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900 text-gray-800 dark:text-white">
      <Suspense fallback={<p>Memuat...</p>}>
        <SelectMerchantContent />
      </Suspense>
    </div>
  );
}