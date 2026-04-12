"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; // Tambahkan useSearchParams
import React, { FormEvent, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { saveActiveMerchant } from "@/lib/auth";

type CreateMerchantResponse = {
  success: boolean;
  message: string;
  data: {
    merchant: {
      id: string;
      name: string;
      address?: string;
      phone?: string;
      status: string;
    };
    membership: {
      merchantUserId: string;
      role: string;
      status: string;
    };
  };
};

export default function CreateMerchantPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook untuk membaca query parameter
  
  // Ambil nilai parameter 'from'
  const fromSource = searchParams.get("from");

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tentukan tujuan tombol Back berdasarkan parameter
  const backConfig = useMemo(() => {
    if (fromSource === "onboarding") {
      return { label: "Back to sign in", href: "/signin" };
    }
    return { label: "Back to dashboard", href: "/admin/dashboard" };
  }, [fromSource]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.post<CreateMerchantResponse>("/merchants", form);

      setSuccess(result.message || "Merchant berhasil dibuat");

      saveActiveMerchant({
        merchantUserId: result.data.membership.merchantUserId,
        merchantId: result.data.merchant.id,
        merchantName: result.data.merchant.name,
        role: result.data.membership.role,
      });

      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Gagal membuat merchant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-5">
          {/* Tombol Back Dinamis */}
          <Link
            href={backConfig.href}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← {backConfig.label}
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Create Merchant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Setelah merchant dibuat, akun kamu otomatis menjadi Owner.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Merchant Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Contoh: Toko Hafizhan"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Contoh: Pekanbaru"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="08123456789"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Merchant"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}