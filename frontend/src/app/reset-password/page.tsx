"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { FormEvent, useState, Suspense } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showModal, setShowModal] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Token reset tidak valid atau tidak ditemukan.</p>
        <Link href="/signin" className="text-sm font-medium text-brand-500 hover:underline">
          Kembali ke Sign In
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post<{ success: boolean; message: string }>("/auth/reset-password", {
        token,
        newPassword: password,
      });
      
      setShowModal(true);
      
      setTimeout(() => { 
        router.push("/signin"); 
      }, 4000);
    } catch (err: unknown) {
      // FIXED: Menangani tipe unknown dengan pengecekan Error instance
      const errorMessage = err instanceof Error ? err.message : "Gagal mereset password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="text-left">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password Baru
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading || password.length < 6}
          className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-all"
        >
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>

      {/* --- MODAL POP-UP SUKSES --- */}
      {showModal && (
        // FIXED: z-[999] diubah menjadi z-999
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900 border dark:border-gray-800 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
              Password Diperbarui!
            </h3>
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
              Password Anda telah berhasil diubah. Silakan gunakan password baru Anda untuk masuk kembali.
            </p>

            <button
              onClick={() => router.push("/signin")}
              className="w-full rounded-lg bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all"
            >
              Sign In Sekarang
            </button>
            <p className="mt-4 text-[10px] text-gray-400">Mengarahkan otomatis dalam beberapa detik...</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900 text-left">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        
        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Reset Password
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Silakan masukkan password baru Anda untuk memulihkan akses akun.
        </p>
        
        <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
          <Link href="/signin" className="text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors dark:text-gray-400 dark:hover:text-brand-400">
            ← Kembali ke Halaman Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}