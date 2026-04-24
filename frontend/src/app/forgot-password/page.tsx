"use client";

import Link from "next/link";
import React, { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
      setMessage(res.message);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Gagal mengirim permintaan");
    } finally {
      setLoading(false);
    }
  }

  return (
    // PEMBUNGKUS LUAR (IDENTIK)
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900">
      {/* KOTAK PUTIH (IDENTIK) */}
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        
        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Forgot Password
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Masukkan email Anda dan kami akan mengirimkan instruksi untuk mereset password.
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
            className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
          <Link href="/signin" className="text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors">
            ← Kembali ke Halaman Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}