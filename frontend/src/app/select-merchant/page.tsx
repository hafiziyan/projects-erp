"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveActiveMerchant } from "@/lib/auth";

export default function SelectMerchantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Deteksi parameter ?from=dashboard
  const from = searchParams.get("from");

  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchants();
  }, []);

  async function fetchMerchants() {
    try {
      const response = await api.get("/auth/me");
      setMerchants(response.data.merchants || []);
    } catch (err) {
      console.error("Gagal mengambil data merchant", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (merchant: any) => {
    saveActiveMerchant(merchant);
    router.push("/admin/dashboard");
  };

  // MODIFIKASI: Logika Tombol Kembali yang dipaksa
  const handleBack = () => {
    if (from === "dashboard") {
      router.push("/admin/dashboard");
    } else {
      router.push("/signin");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-lg">
        <div className="mb-5">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors"
          >
            ← Kembali ke {from === "dashboard" ? "Dashboard" : "Sign In"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Pilih Merchant</h1>
            <p className="text-sm text-gray-500">Silakan pilih toko untuk mulai mengelola data.</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Memuat data...</div>
            ) : (
              merchants.map((item: any) => (
                <button
                  key={item.merchantId}
                  onClick={() => handleSelect(item)}
                  className="group flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-700"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 dark:text-white group-hover:text-brand-600">
                      {item.merchantName}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500 tracking-wider">{item.role}</p>
                  </div>
                  <div className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Pilih →
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}