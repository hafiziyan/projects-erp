"use client";

import Link from "next/link";
import React, { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // --- STATE UNTUK MODAL ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
      setApiMessage(res.message);
      setEmail("");
      // Munculkan modal sukses
      setShowSuccessModal(true);
    } catch (err: unknown) {
      // FIXED: Menangani tipe unknown dengan pengecekan Error instance
      const errorMessage = err instanceof Error ? err.message : "Gagal mengirim permintaan";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900 text-left">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        
        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Forgot Password
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Masukkan email Anda dan kami akan mengirimkan instruksi untuk mereset password.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-all"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
          <Link href="/signin" className="text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors dark:text-gray-400 dark:hover:text-brand-400">
            ← Kembali ke Halaman Sign In
          </Link>
        </div>
      </div>

      {/* --- MODAL POP-UP SUKSES --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900 border dark:border-gray-800 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-brand-500/10">
              {/* Ikon Email Terkirim */}
              <svg className="h-10 w-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">
              Cek Email Anda!
            </h3>
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {apiMessage || "Instruksi reset password telah dikirim ke alamat email Anda. Silakan cek folder inbox atau spam."}
            </p>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-lg bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 transition-all"
            >
              Oke, Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}